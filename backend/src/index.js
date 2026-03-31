require('dotenv').config();
const express = require('express');
const cors = require('cors');

const scanRouter = require('./routes/scan');
const webhookRouter = require('./routes/webhooks');
const expensesRouter = require('./routes/expenses');
const profileRouter = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

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
