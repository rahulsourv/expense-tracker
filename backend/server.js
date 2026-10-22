import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import salaryRoutes from './routes/salary.js';
import expensesRoutes from './routes/expenses.js';
import billsRoutes from './routes/bills.js';
import investmentsRoutes from './routes/investments.js';
import savingsTransfersRoutes from './routes/savingsTransfers.js';
import loansRoutes from './routes/loans.js';
import customCategoriesRoutes from './routes/customCategories.js';
import cardsRoutes from './routes/cards.js';
import incomeRoutes from './routes/income.js';
import savingsGoalsRoutes from './routes/savingsGoals.js';
import accountsRoutes from './routes/accounts.js';
import cashBalancesRoutes from './routes/cashBalances.js';
import settingsRoutes from './routes/settings.js';
import dataRoutes from './routes/data.js';

// Import DB pool to test connection
import pool from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const isLocalDevelopmentOrigin = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ─── API Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/savings-transfers', savingsTransfersRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/custom-categories', customCategoriesRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/savings-goals', savingsGoalsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/cash-balances', cashBalancesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/data', dataRoutes);

// ─── Health Check ───────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbResult.rows[0].now,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ─── 404 Handler ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  🏦 NYNET - NOT YOUR NORMAL EXPENSE TRACKER         ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on http://localhost:${PORT}          ║`);
  console.log(`║  📡 CORS allowed: ${allowedOrigins.join(', ')}        ║`);
  console.log('║  🗄️  PostgreSQL via Neon (free tier)                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
