const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

/**
 * GET /api/insights/inflation
 * Logic: Compares the price of the same item at the same merchant over time.
 */
router.get('/inflation', requireAuth, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('merchant_name, line_items, date')
      .eq('user_id', req.userId)
      .order('date', { ascending: true });

    if (error) throw error;

    const itemHistory = {};

    expenses.forEach(exp => {
      if (!exp.line_items || !Array.isArray(exp.line_items)) return;

      exp.line_items.forEach(item => {
        const key = `${exp.merchant_name}::${item.name.toLowerCase().trim()}`;
        if (!itemHistory[key]) {
          itemHistory[key] = [];
        }
        itemHistory[key].push({
          price: item.price,
          date: exp.date,
          merchant: exp.merchant_name,
          itemName: item.name
        });
      });
    });

    const inflationData = Object.keys(itemHistory)
      .map(key => {
        const history = itemHistory[key];
        if (history.length < 2) return null;

        const first = history[0];
        const last = history[history.length - 1];
        const priceChange = ((last.price - first.price) / first.price) * 100;

        return {
          itemName: first.itemName,
          merchant: first.merchant,
          firstPrice: first.price,
          firstDate: first.date,
          lastPrice: last.price,
          lastDate: last.date,
          percentageChange: Number(priceChange.toFixed(2)),
          history
        };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));

    return res.json({ success: true, data: inflationData });
  } catch (err) {
    console.error('[insights/inflation] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/insights/what-if
 * Logic: AI-driven financial forecasting based on 3 months of data.
 */
router.post('/what-if', requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });

    // Fetch last 3 months of expenses
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

    if (error) throw error;

    // --- Call Gemini API with Retry & Fallback ---
    async function getGeminiResponse(prompt, modelName = PRIMARY_MODEL, retryCount = 0) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn(`[insights] Model ${modelName} hit rate limit (Attempt ${retryCount + 1})`);
          if (modelName === PRIMARY_MODEL && retryCount === 0) {
            console.log(`[insights] Falling back to ${FALLBACK_MODEL}...`);
            return getGeminiResponse(prompt, FALLBACK_MODEL, 0);
          }
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 10000;
            console.log(`[insights] Retrying ${modelName} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getGeminiResponse(prompt, modelName, retryCount + 1);
          }
        }
        throw error;
      }
    }

    // 1. Format expenses for the AI
    const expenseSummary = expenses.map(e => `- ${e.date}: ${e.merchant_name} (${e.category}) - ₹${e.total_amount}`).join('\n');

    // 2. Build the final prompt
    const prompt = `
      You are a financial advisor assistant for the ReceiptFlow app.
      Here are the user's expenses from the last 3 months:
      ${expenseSummary || 'No expenses recorded yet.'}

      The user has a "What-If" budgeting question:
      "${query}"

      Analyze their data and provide a concise (max 150 words), helpful analysis. 
      If they don't have enough data, suggest how the change would impact an average budget.
      Format your response with clear bullet points.
    `;

    // 3. Call Gemini
    const analysis = await getGeminiResponse(prompt);

    return res.json({ success: true, analysis });
  } catch (err) {
    console.error('[insights/what-if] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/insights/split
 * Split an expense among multiple people.
 * Body: { expenseId: string, numberOfPeople: number, customSplits?: { name: string, amount: number }[] }
 */
router.post('/split', requireAuth, async (req, res) => {
  try {
    const { expenseId, numberOfPeople } = req.body;
    if (!expenseId || !numberOfPeople || numberOfPeople < 2) {
      return res.status(400).json({ error: 'expenseId and numberOfPeople (>=2) are required.' });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('user_id', req.userId)
      .single();

    if (error || !expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const total = Number(expense.total_amount);
    const perPerson = Number((total / numberOfPeople).toFixed(2));
    const remainder = Number((total - perPerson * numberOfPeople).toFixed(2));

    // Build line items split
    const lineItemSplits = (expense.line_items || []).map(item => ({
      name: item.name,
      totalPrice: item.price,
      perPerson: Number((item.price / numberOfPeople).toFixed(2)),
    }));

    // Generate shareable text
    const shareText = `💰 Split from ${expense.merchant_name}\n` +
      `📅 ${expense.date}\n` +
      `💵 Total: ₹${total.toFixed(2)}\n` +
      `👥 ${numberOfPeople} people → ₹${perPerson.toFixed(2)} each\n` +
      (lineItemSplits.length > 0
        ? `\n📋 Items:\n${lineItemSplits.map(i => `  • ${i.name}: ₹${i.perPerson.toFixed(2)}/person`).join('\n')}\n`
        : '') +
      `\nSent via ReceiptFlow 📱`;

    return res.json({
      success: true,
      data: {
        merchantName: expense.merchant_name,
        date: expense.date,
        total,
        numberOfPeople,
        perPerson,
        remainder,
        lineItemSplits,
        shareText,
      },
    });
  } catch (err) {
    console.error('[insights/split] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
