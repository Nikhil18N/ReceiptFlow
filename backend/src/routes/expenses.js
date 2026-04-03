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

/**
 * POST /api/expenses/manual
 * Add an expense manually without scanning a receipt.
 * Body: { merchantName, totalAmount, date, category, lineItems? }
 */
router.post('/manual', requireAuth, async (req, res) => {
  try {
    const { merchantName, totalAmount, date, category, lineItems } = req.body;
    if (!merchantName || !totalAmount || !date || !category) {
      return res.status(400).json({ error: 'merchantName, totalAmount, date, and category are required.' });
    }

    // Ensure profile exists
    await supabase
      .from('profiles')
      .upsert({ id: req.userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        user_id: req.userId,
        merchant_name: merchantName,
        total_amount: totalAmount,
        date,
        category,
        line_items: lineItems || [],
      }])
      .select()
      .single();

    if (error) throw error;

    // Auto-generate notification
    try {
      await supabase.from('notifications').insert([{
        user_id: req.userId,
        type: 'expense_added',
        title: `📝 Expense Added`,
        body: `${merchantName} — ₹${Number(totalAmount).toFixed(2)} added to ${category}.`,
        icon: 'create',
        color: '#10B981',
        metadata: JSON.stringify({ expenseId: data.id }),
        read: false,
      }]);
    } catch (notifErr) {
      console.error('[expenses/manual] Notification error (non-fatal):', notifErr);
    }

    return res.json({
      success: true,
      data: {
        id: data.id,
        merchantName: data.merchant_name,
        totalAmount: data.total_amount,
        date: data.date,
        category: data.category,
        lineItems: data.line_items,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[expenses/manual] Error:', err);
    return res.status(500).json({ error: 'Failed to add expense.' });
  }
});

/**
 * GET /api/expenses/calendar?month=2026-04
 * Returns daily spending totals for a given month.
 */
router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ error: 'month query param required (YYYY-MM).' });

    const startDate = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const endDate = new Date(year, mon, 0); // last day of month
    const endDateStr = `${year}-${String(mon).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('expenses')
      .select('date, total_amount, merchant_name')
      .eq('user_id', req.userId)
      .gte('date', startDate)
      .lte('date', endDateStr);

    if (error) throw error;

    // Group by day
    const dailyMap = {};
    data.forEach(e => {
      if (!dailyMap[e.date]) {
        dailyMap[e.date] = { total: 0, count: 0, merchants: [] };
      }
      dailyMap[e.date].total += Number(e.total_amount);
      dailyMap[e.date].count += 1;
      if (!dailyMap[e.date].merchants.includes(e.merchant_name)) {
        dailyMap[e.date].merchants.push(e.merchant_name);
      }
    });

    // Build array for all days in the month
    const daysInMonth = endDate.getDate();
    const calendar = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = dailyMap[dateStr];
      calendar.push({
        date: dateStr,
        total: dayData ? Number(dayData.total.toFixed(2)) : 0,
        count: dayData ? dayData.count : 0,
        merchants: dayData ? dayData.merchants : [],
      });
    }

    return res.json({ success: true, data: calendar });
  } catch (err) {
    console.error('[expenses/calendar] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/expenses/recurring
 * Detects merchants appearing 3+ times with consistent amounts.
 */
router.get('/recurring', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('merchant_name, total_amount, date, category')
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Group by merchant
    const merchantMap = {};
    data.forEach(e => {
      const key = e.merchant_name;
      if (!merchantMap[key]) {
        merchantMap[key] = { amounts: [], dates: [], category: e.category };
      }
      merchantMap[key].amounts.push(Number(e.total_amount));
      merchantMap[key].dates.push(e.date);
    });

    const recurring = Object.entries(merchantMap)
      .filter(([_, info]) => info.amounts.length >= 3)
      .map(([merchant, info]) => {
        const avg = info.amounts.reduce((a, b) => a + b, 0) / info.amounts.length;
        const isConsistent = info.amounts.every(a => Math.abs(a - avg) / avg < 0.25); // within 25%
        return {
          merchant,
          category: info.category,
          averageAmount: Number(avg.toFixed(2)),
          occurrences: info.amounts.length,
          isConsistent,
          lastDate: info.dates[0],
          estimatedMonthly: Number(avg.toFixed(2)),
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences);

    return res.json({ success: true, data: recurring });
  } catch (err) {
    console.error('[expenses/recurring] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/expenses/:id
 * Returns full detail of a single expense including line items.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Expense not found.' });

    return res.json({
      success: true,
      data: {
        id: data.id,
        merchantName: data.merchant_name,
        totalAmount: data.total_amount,
        date: data.date,
        category: data.category,
        lineItems: data.line_items || [],
        returnDate: data.return_date,
        warrantyDate: data.warranty_date,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[expenses/:id] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
