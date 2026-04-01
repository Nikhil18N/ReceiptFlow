const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/expenses
 * Returns paginated list of user's expenses, newest first.
 * Query params: ?limit=20&offset=0&category=Food%20%26%20Drink&search=starbucks
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, category, search } = req.query;

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('merchant_name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[expenses] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch expenses.', details: error.message });
    }

    return res.json({
      success: true,
      data: data.map(row => ({
        id: row.id,
        merchantName: row.merchant_name,
        totalAmount: row.total_amount,
        date: row.date,
        category: row.category,
        createdAt: row.created_at,
      })),
      pagination: {
        total: count,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (err) {
    console.error('[expenses] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

/**
 * GET /api/expenses/stats
 * Returns spending statistics for the current month:
 * - monthlyTotal, dailyTotals[], categoryBreakdown[], topMerchants[], recentExpenses[]
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get all expenses for this user
    const { data: allExpenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[expenses/stats] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch stats.', details: error.message });
    }

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = allExpenses.filter(e => new Date(e.created_at) >= monthStart);

    // Monthly total
    const monthlyTotal = monthExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

    // Category breakdown
    const catMap = {};
    monthExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.total_amount);
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);

    // Top merchants
    const merchMap = {};
    allExpenses.forEach(e => {
      merchMap[e.merchant_name] = (merchMap[e.merchant_name] || 0) + Number(e.total_amount);
    });
    const topMerchants = Object.entries(merchMap)
      .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Daily totals (last 7 days)
    const dailyTotals = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];
      const dayTotal = allExpenses
        .filter(e => e.date === dayStr || e.created_at?.startsWith(dayStr))
        .reduce((sum, e) => sum + Number(e.total_amount), 0);
      dailyTotals.push({
        date: dayStr,
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: Number(dayTotal.toFixed(2)),
      });
    }

    // Recent 5
    const recentExpenses = allExpenses.slice(0, 5).map(row => ({
      id: row.id,
      merchantName: row.merchant_name,
      totalAmount: row.total_amount,
      date: row.date,
      category: row.category,
      createdAt: row.created_at,
    }));

    // Total all-time
    const allTimeTotal = allExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
    const totalReceipts = allExpenses.length;

    return res.json({
      success: true,
      data: {
        monthlyTotal: Number(monthlyTotal.toFixed(2)),
        allTimeTotal: Number(allTimeTotal.toFixed(2)),
        totalReceipts,
        categoryBreakdown,
        topMerchants,
        dailyTotals,
        recentExpenses,
      },
    });
  } catch (err) {
    console.error('[expenses/stats] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

/**
 * GET /api/expenses/export
 * Returns all user's expenses in CSV format.
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('merchant_name, total_amount, date, category, created_at')
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[expenses/export] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch data for export.' });
    }

    // Generate CSV
    const headers = ['Merchant', 'Amount', 'Date', 'Category', 'Logged At'];
    const rows = data.map(e => [
      `"${e.merchant_name.replace(/"/g, '""')}"`,
      e.total_amount,
      e.date,
      `"${e.category}"`,
      e.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    return res.send(csvContent);
  } catch (err) {
    console.error('[expenses/export] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
