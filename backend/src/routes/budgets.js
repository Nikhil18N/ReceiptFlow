const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/budgets
 * Returns all budgets for the current user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', req.userId)
      .order('category', { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[budgets] Fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch budgets.' });
  }
});

/**
 * GET /api/budgets/status
 * Returns budgets with current month spending progress.
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    // 1. Get all budgets
    const { data: budgets, error: budgetErr } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', req.userId);

    if (budgetErr) throw budgetErr;

    // 2. Get current month expenses
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('category, total_amount')
      .eq('user_id', req.userId)
      .gte('date', monthStart);

    if (expErr) throw expErr;

    // 3. Calculate spending per category
    const spendingByCategory = {};
    expenses.forEach(e => {
      spendingByCategory[e.category] = (spendingByCategory[e.category] || 0) + Number(e.total_amount);
    });

    // 4. Merge
    const status = budgets.map(b => ({
      id: b.id,
      category: b.category,
      monthlyLimit: Number(b.monthly_limit),
      spent: Number((spendingByCategory[b.category] || 0).toFixed(2)),
      percentage: b.monthly_limit > 0
        ? Number((((spendingByCategory[b.category] || 0) / b.monthly_limit) * 100).toFixed(1))
        : 0,
    }));

    return res.json({ success: true, data: status });
  } catch (err) {
    console.error('[budgets/status] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/budgets
 * Create or update a budget (upsert on user_id + category).
 * Body: { category: string, monthlyLimit: number }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;
    if (!category || monthlyLimit === undefined) {
      return res.status(400).json({ error: 'category and monthlyLimit are required.' });
    }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: req.userId, category, monthly_limit: monthlyLimit },
        { onConflict: 'user_id,category' }
      )
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[budgets] Upsert error:', err);
    return res.status(500).json({ error: 'Failed to save budget.' });
  }
});

/**
 * DELETE /api/budgets/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[budgets] Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

module.exports = router;
