const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/notifications/register
 * Body: { token: string }
 */
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Push token is required.' });

    const { data, error } = await supabase
      .from('user_tokens')
      .upsert(
        { user_id: req.userId, expo_push_token: token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[notifications] Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/notifications
 * Returns all in-app notifications for the user, newest first.
 * Query: ?limit=20&unread_only=true
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const unreadOnly = req.query.unread_only === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw error;

    // Also get unread count
    const { count, error: countErr } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('read', false);

    return res.json({
      success: true,
      data: data || [],
      unreadCount: countErr ? 0 : count,
    });
  } catch (err) {
    console.error('[notifications] Fetch error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Returns just the unread notification count.
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('read', false);

    if (error) throw error;
    return res.json({ success: true, count: count || 0 });
  } catch (err) {
    console.error('[notifications] Count error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/notifications/mark-read
 * Body: { notificationIds: string[] } or { all: true }
 */
router.post('/mark-read', requireAuth, async (req, res) => {
  try {
    const { notificationIds, all } = req.body;

    if (all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.userId)
        .eq('read', false);
      if (error) throw error;
    } else if (notificationIds?.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds)
        .eq('user_id', req.userId);
      if (error) throw error;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[notifications] Mark-read error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/notifications/generate
 * Generates contextual notifications based on the user's current data.
 * Called periodically or on-demand to check for budget alerts, milestones, etc.
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const notifications = [];

    // 1. Budget alerts — check if any budget is over 80% or 100%
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', req.userId);

    if (budgets?.length > 0) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('category, total_amount')
        .eq('user_id', req.userId)
        .gte('date', monthStart);

      const spending = {};
      (expenses || []).forEach(e => {
        spending[e.category] = (spending[e.category] || 0) + Number(e.total_amount);
      });

      for (const budget of budgets) {
        const spent = spending[budget.category] || 0;
        const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;

        if (pct >= 100) {
          notifications.push({
            type: 'budget_exceeded',
            title: `🚨 ${budget.category} Budget Exceeded!`,
            body: `You've spent ₹${spent.toFixed(0)} of your ₹${budget.monthly_limit} limit (${Math.round(pct)}%).`,
            icon: 'alert-circle',
            color: '#EF4444',
            metadata: { category: budget.category, spent, limit: budget.monthly_limit },
          });
        } else if (pct >= 80) {
          notifications.push({
            type: 'budget_warning',
            title: `⚠️ ${budget.category} Budget at ${Math.round(pct)}%`,
            body: `You've spent ₹${spent.toFixed(0)} of your ₹${budget.monthly_limit} ${budget.category} budget. Slow down!`,
            icon: 'warning',
            color: '#F59E0B',
            metadata: { category: budget.category, spent, limit: budget.monthly_limit },
          });
        }
      }
    }

    // 2. Return/Warranty reminders — items expiring within 7 days
    const inAWeek = new Date();
    inAWeek.setDate(inAWeek.getDate() + 7);
    const weekStr = inAWeek.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const { data: expiring } = await supabase
      .from('expenses')
      .select('id, merchant_name, return_date, warranty_date')
      .eq('user_id', req.userId)
      .or(`return_date.gte.${todayStr},warranty_date.gte.${todayStr}`)
      .or(`return_date.lte.${weekStr},warranty_date.lte.${weekStr}`);

    if (expiring) {
      for (const exp of expiring) {
        if (exp.return_date && exp.return_date >= todayStr && exp.return_date <= weekStr) {
          const daysLeft = Math.ceil((new Date(exp.return_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            type: 'return_reminder',
            title: `📦 Return window closing`,
            body: `${exp.merchant_name} — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to return.`,
            icon: 'arrow-undo',
            color: '#F59E0B',
            metadata: { expenseId: exp.id },
          });
        }
        if (exp.warranty_date && exp.warranty_date >= todayStr && exp.warranty_date <= weekStr) {
          const daysLeft = Math.ceil((new Date(exp.warranty_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            type: 'warranty_reminder',
            title: `🛡️ Warranty expiring`,
            body: `${exp.merchant_name} warranty expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
            icon: 'shield',
            color: '#3B82F6',
            metadata: { expenseId: exp.id },
          });
        }
      }
    }

    // 3. Spending milestones
    const { count: totalReceipts } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    const milestones = [5, 10, 25, 50, 100, 250, 500];
    for (const m of milestones) {
      if (totalReceipts === m) {
        notifications.push({
          type: 'milestone',
          title: `🎉 ${m} Receipts Scanned!`,
          body: `You've reached ${m} receipts! You're building great financial habits.`,
          icon: 'trophy',
          color: '#10B981',
          metadata: { milestone: m },
        });
      }
    }

    // 4. No-scan reminder (if no receipts in last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { count: recentCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('created_at', threeDaysAgo.toISOString());

    if (recentCount === 0 && totalReceipts > 0) {
      notifications.push({
        type: 'reminder',
        title: `📸 Don't forget to scan!`,
        body: `You haven't added any receipts in 3 days. Scan to keep your records complete.`,
        icon: 'camera',
        color: '#8B5CF6',
        metadata: {},
      });
    }

    // Deduplicate — don't insert if same type+title exists today
    const insertable = [];
    for (const n of notifications) {
      const { count: existing } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('type', n.type)
        .eq('title', n.title)
        .gte('created_at', todayStr + 'T00:00:00Z');

      if (existing === 0) {
        insertable.push({
          user_id: req.userId,
          ...n,
          metadata: JSON.stringify(n.metadata || {}),
          read: false,
        });
      }
    }

    if (insertable.length > 0) {
      const { error } = await supabase.from('notifications').insert(insertable);
      if (error) console.error('[notifications/generate] Insert error:', error);
    }

    return res.json({ success: true, generated: insertable.length });
  } catch (err) {
    console.error('[notifications/generate] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
