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

Example output:
{"merchantName":"Starbucks","totalAmount":5.45,"date":"2023-11-24","category":"Food & Drink"}`;

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

    // --- 3. Call Gemini API ---
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([GEMINI_SYSTEM_PROMPT, imagePart]);
    const responseText = result.response.text().trim();

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
        error: 'AI response is missing required fields.',
        parsed: receiptData,
      });
    }

    // --- 5. Insert into Supabase ---
    const { data: insertedRow, error: dbError } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: req.userId,
          merchant_name: merchantName,
          total_amount: totalAmount,
          date: date,
          category: category,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('[scan] Supabase insert error:', dbError);
      return res.status(500).json({ error: 'Database error: Could not save expense.', details: dbError.message });
    }

    console.log(`[scan] Expense saved: id=${insertedRow.id}`);

    // --- 6. Return success ---
    return res.status(200).json({
      success: true,
      data: {
        id: insertedRow.id,
        merchantName: insertedRow.merchant_name,
        totalAmount: insertedRow.total_amount,
        date: insertedRow.date,
        category: insertedRow.category,
        createdAt: insertedRow.created_at,
      },
    });
  } catch (err) {
    console.error('[scan] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

module.exports = router;
