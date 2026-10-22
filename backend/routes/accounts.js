import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const formatAccount = (row) => ({
  id: row.id,
  name: row.name,
  accountType: row.account_type,
  openingBalance: Number(row.opening_balance) || 0,
  isActive: row.is_active !== false,
  notes: row.notes,
});

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM accounts WHERE user_id=$1 ORDER BY is_active DESC, name ASC', [req.userId]);
    res.json(result.rows.map(formatAccount));
  } catch (error) { console.error('Get accounts error:', error); res.status(500).json({ error: 'Failed to fetch accounts.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, accountType, openingBalance, isActive, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Account name is required.' });
    if (openingBalance !== undefined && (!Number.isFinite(Number(openingBalance)) || Number(openingBalance) < 0)) return res.status(400).json({ error: 'Opening balance must be a non-negative number.' });
    const accountId = id || `account-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query('INSERT INTO accounts (id,user_id,name,account_type,opening_balance,is_active,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [accountId, req.userId, name.trim(), accountType || 'Other Account', Number(openingBalance) || 0, isActive !== false, notes]);
    res.status(201).json(formatAccount(result.rows[0]));
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account with this name already exists.' }); console.error('Create account error:', error); res.status(500).json({ error: 'Failed to create account.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, accountType, openingBalance, isActive, notes } = req.body;
    if (name !== undefined && !name?.trim()) return res.status(400).json({ error: 'Account name cannot be empty.' });
    if (openingBalance !== undefined && (!Number.isFinite(Number(openingBalance)) || Number(openingBalance) < 0)) return res.status(400).json({ error: 'Opening balance must be a non-negative number.' });
    const result = await query('UPDATE accounts SET name=COALESCE($3,name), account_type=COALESCE($4,account_type), opening_balance=COALESCE($5,opening_balance), is_active=COALESCE($6,is_active), notes=$7 WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.userId, name?.trim(), accountType, openingBalance === undefined ? null : Number(openingBalance) || 0, isActive, notes]);
    if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
    res.json(formatAccount(result.rows[0]));
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account with this name already exists.' }); console.error('Update account error:', error); res.status(500).json({ error: 'Failed to update account.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('UPDATE accounts SET is_active=FALSE WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
    res.json({ message: 'Account archived.', id: req.params.id });
  } catch (error) { console.error('Archive account error:', error); res.status(500).json({ error: 'Failed to archive account.' }); }
});

export default router;
