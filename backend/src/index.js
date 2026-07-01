require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');

const scanRouter = require('./routes/scan');
const webhookRouter = require('./routes/webhooks');
const expensesRouter = require('./routes/expenses');
const profileRouter = require('./routes/profile');
const notificationsRouter = require('./routes/notifications');
const insightsRouter = require('./routes/insights');
const budgetsRouter = require('./routes/budgets');
const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize clients for Cron
const expo = new Expo();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Render Keep-Alive (Every 14 minutes) ────────────────────────────────────
// Render free-tier services spin down after 15 min of inactivity.
// This self-ping keeps the server awake. Uses RENDER_EXTERNAL_HOSTNAME
// which Render injects automatically — no config needed in production.
cron.schedule('*/14 * * * *', () => {
  const host = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!host) return; // Skip in local dev

  const url = `https://${host}/health`;
  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    console.log(`[render-ping] Self-ping ${url} → ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('[render-ping] Self-ping failed:', err.message);
  });
});

// ── Keep-Alive Ping (Every 3 days at 6:00 AM) ───────────────────────────────
// Prevents Supabase free-tier project from auto-pausing due to inactivity.
cron.schedule('0 6 */3 * *', async () => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('[keep-alive] Supabase ping successful.');
  } catch (err) {
    console.error('[keep-alive] Supabase ping failed:', err.message);
  }
});

// ── Daily Cron Job (8:00 AM) ──────────────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  console.log('[cron] Running daily reminder check...');
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Query expenses where return_date or warranty_date is 3 days away
    const { data: upcoming, error } = await supabase
      .from('expenses')
      .select('*')
      .or(`return_date.gte.${dateStr}T00:00:00Z,return_date.lt.${dateStr}T23:59:59Z,warranty_date.gte.${dateStr}T00:00:00Z,warranty_date.lt.${dateStr}T23:59:59Z`);

    if (error) throw error;
    if (!upcoming || upcoming.length === 0) return;

    // Send notifications for each
    for (const expense of upcoming) {
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('expo_push_token')
        .eq('user_id', expense.user_id)
        .single();

      if (tokenData?.expo_push_token && Expo.isExpoPushToken(tokenData.expo_push_token)) {
        const isReturn = expense.return_date?.startsWith(dateStr);
        const title = isReturn ? 'Return window closing soon!' : 'Warranty expiring soon!';
        const message = isReturn 
          ? `Your return window for "${expense.merchant_name}" ends in 3 days.` 
          : `Your warranty for "${expense.merchant_name}" expires in 3 days.`;

        await expo.sendPushNotificationsAsync([{
          to: tokenData.expo_push_token,
          sound: 'default',
          title,
          body: message,
          data: { expenseId: expense.id },
        }]);
        console.log(`[cron] Notification sent to ${expense.user_id} for expense ${expense.id}`);
      }
    }
  } catch (err) {
    console.error('[cron] Error in daily reminder check:', err);
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());

// ⚠️  IMPORTANT: The Clerk webhook route MUST be mounted with express.raw()
// BEFORE express.json() — Svix signature verification needs the raw Buffer.
app.use('/webhooks/clerk', express.raw({ type: 'application/json' }), webhookRouter);

// General JSON parsing for all other routes
app.use(express.json());

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReceiptFlow API', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/scan', scanRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/profile', profileRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/budgets', budgetsRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.', details: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ ReceiptFlow API is running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
