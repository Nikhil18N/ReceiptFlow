const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// Multer: store image in memory (no disk writes)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

// Initialize Supabase client with Service Role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_SYSTEM_PROMPT = `You are a receipt OCR engine. Analyze the receipt image provided by the user.
Return ONLY a single valid JSON object — no markdown, no explanation, no code blocks.
The JSON must have exactly these keys:
- "merchantName": string — the name of the store or vendor
- "totalAmount": number — the final total paid (not subtotal, not tax)
- "date": string — the receipt date in ISO 8601 format (YYYY-MM-DD). If unclear, use today's date.
- "category": string — one of: "Food & Drink", "Groceries", "Transport", "Shopping", "Travel", "Entertainment", "Healthcare", "Other"
- "lineItems": array of objects — each object must have "name" (string) and "price" (number). 
- "returnWindowDays": number — the number of days allowed for returns (e.g. 30). If not found, use 30 as a safe default for major retailers.
- "warrantyPeriodMonths": number — the warranty period in months. If not found or not applicable, use null.

Example output:
{
  "merchantName": "Starbucks",
  "totalAmount": 5.45,
  "date": "2023-11-24",
  "category": "Food & Drink",
  "lineItems": [{"name": "Caramel Macchiato", "price": 4.50}, {"name": "Muffin", "price": 0.95}],
  "returnWindowDays": 30,
  "warrantyPeriodMonths": null
}`;

/**
 * POST /api/scan
 * Requires: Authorization: Bearer <clerk_jwt>
 * Body:     multipart/form-data with field "image"
 * Returns:  { success: true, data: <supabase row> }
 */
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    // --- 1. Validate the uploaded file ---
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided. Send it as form-data with key "image".' });
    }

    console.log(`[scan] Processing receipt for user: ${req.userId}`);

    // --- 2. Prepare image for Gemini ---
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    };

    // --- 3. Call Gemini API with Retry & Fallback ---
    async function getGeminiResponse(imagePart, modelName = PRIMARY_MODEL, retryCount = 0) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([GEMINI_SYSTEM_PROMPT, imagePart]);
        return result.response.text();
      } catch (error) {
        // If we hit a rate limit (429) or other transient error
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn(`[scan] Model ${modelName} hit rate limit (Attempt ${retryCount + 1})`);
          
          // Fallback to lite if primary is failing
          if (modelName === PRIMARY_MODEL && retryCount === 0) {
            console.log(`[scan] Falling back to ${FALLBACK_MODEL}...`);
            return getGeminiResponse(imagePart, FALLBACK_MODEL, 0);
          }
          
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 10000; // 10s, 20s backoff for quota
            console.log(`[scan] Retrying ${modelName} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getGeminiResponse(imagePart, modelName, retryCount + 1);
          }
        }
        throw error;
      }
    }

    const responseTextRaw = await getGeminiResponse(imagePart);
    const responseText = responseTextRaw.trim();

    console.log('[scan] Gemini raw response:', responseText);

    // --- 4. Parse the JSON response from Gemini ---
    let receiptData;
    try {
      // Strip markdown code fences if Gemini wraps the JSON (defensive parse)
      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      receiptData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[scan] Failed to parse Gemini JSON:', parseErr.message);
      return res.status(422).json({
        error: 'AI could not extract structured data from the receipt. Please retake the photo.',
        rawResponse: responseText,
      });
    }

    // Validate required fields
    const { merchantName, totalAmount, date, category } = receiptData;
    if (!merchantName || totalAmount === undefined || !date || !category) {
      return res.status(422).json({
        error: 'AI response is missing required core fields.',
        parsed: receiptData,
      });
    }

    // --- 5. Calculate Return and Warranty Dates ---
    const receiptDateObj = new Date(date);
    let returnDate = null;
    let warrantyDate = null;

    if (receiptData.returnWindowDays) {
      const rd = new Date(receiptDateObj);
      rd.setDate(rd.getDate() + receiptData.returnWindowDays);
      returnDate = rd.toISOString();
    }

    if (receiptData.warrantyPeriodMonths) {
      const wd = new Date(receiptDateObj);
      wd.setMonth(wd.getMonth() + receiptData.warrantyPeriodMonths);
      warrantyDate = wd.toISOString();
    }

    // --- 6. Ensure user profile exists (JIT Sync) ---
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: req.userId, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('[scan] Profiling upsert error:', profileError);
    }

    // --- 7. Insert into Supabase ---
    const { data: insertedRow, error: dbError } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: req.userId,
          merchant_name: merchantName,
          total_amount: totalAmount,
          date: date,
          category: category,
          line_items: receiptData.lineItems || [],
          return_date: returnDate,
          warranty_date: warrantyDate,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('[scan] Supabase insert error:', dbError);
      return res.status(500).json({ error: 'Database error: Could not save expense.', details: dbError.message });
    }

    console.log(`[scan] Expense saved: id=${insertedRow.id}`);

    // --- 8. Auto-generate notification ---
    try {
      await supabase.from('notifications').insert([{
        user_id: req.userId,
        type: 'expense_added',
        title: `✅ Receipt Scanned`,
        body: `${merchantName} — ₹${Number(totalAmount).toFixed(2)} added to ${category}.`,
        icon: 'checkmark-circle',
        color: '#10B981',
        metadata: JSON.stringify({ expenseId: insertedRow.id }),
        read: false,
      }]);
    } catch (notifErr) {
      console.error('[scan] Notification insert error (non-fatal):', notifErr);
    }

    // --- 8. Return success ---
    return res.status(200).json({
      success: true,
      data: {
        id: insertedRow.id,
        merchantName: insertedRow.merchant_name,
        totalAmount: insertedRow.total_amount,
        date: insertedRow.date,
        category: insertedRow.category,
        lineItems: insertedRow.line_items,
        returnDate: insertedRow.return_date,
        warrantyDate: insertedRow.warranty_date,
        createdAt: insertedRow.created_at,
      },
    });
  } catch (err) {
    console.error('[scan] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

module.exports = router;
