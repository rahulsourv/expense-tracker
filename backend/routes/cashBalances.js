import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const formatBalance = (row) => ({ id: row.id, monthKey: row.month_key, openingBalance: Number(row.opening_balance) || 0, notes: row.notes });

router.get('/', async (req, res) => {
  try { const result = await query('SELECT * FROM cash_balances WHERE user_id=$1 ORDER BY month_key DESC', [req.userId]); res.json(result.rows.map(formatBalance)); }
  catch (error) { console.error('Get cash balances error:', error); res.status(500).json({ error: 'Failed to fetch cash balances.' }); }
});

router.put('/:monthKey', async (req, res) => {
  try {
    const { openingBalance, notes } = req.body;
    if (!/^\d{4}-\d{2}$/.test(req.params.monthKey) || !Number.isFinite(Number(openingBalance)) || Number(openingBalance) < 0) return res.status(400).json({ error: 'Month and non-negative opening balance are required.' });
    const result = await query('INSERT INTO cash_balances (user_id,month_key,opening_balance,notes) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,month_key) DO UPDATE SET opening_balance=EXCLUDED.opening_balance, notes=EXCLUDED.notes, updated_at=NOW() RETURNING *', [req.userId, req.params.monthKey, Number(openingBalance), notes]);
    res.json(formatBalance(result.rows[0]));
  } catch (error) { console.error('Save cash balance error:', error); res.status(500).json({ error: 'Failed to save opening balance.' }); }
});

export default router;
