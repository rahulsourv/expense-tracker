import { Router } from 'express';
import pool, { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';
import { isPositiveAmount, isValidDate } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

const formatGoal = (row, transactions = []) => {
  const target = Number(row.target_amount) || 0;
  const current = Number(row.current_amount) || 0;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetAmount: target,
    currentAmount: current,
    targetDate: toDateString(row.target_date),
    status: row.status || 'Active',
    notes: row.notes,
    progressPercent: target > 0 ? Math.min(100, (current / target) * 100) : 0,
    transactions,
  };
};

const loadGoals = async (userId) => {
  const [goalsResult, txResult] = await Promise.all([
    query('SELECT * FROM savings_goals WHERE user_id=$1 ORDER BY status ASC, target_date ASC NULLS LAST, created_at DESC', [userId]),
    query('SELECT * FROM savings_goal_transactions WHERE user_id=$1 ORDER BY date DESC, created_at DESC', [userId]),
  ]);
  return goalsResult.rows.map((goal) => formatGoal(goal, txResult.rows.filter((tx) => tx.goal_id === goal.id).map((tx) => ({
    id: tx.id,
    date: toDateString(tx.date),
    amount: Number(tx.amount) || 0,
    transactionType: tx.transaction_type,
    notes: tx.notes,
  }))));
};

router.get('/', async (req, res) => {
  try { res.json(await loadGoals(req.userId)); }
  catch (error) { console.error('Get savings goals error:', error); res.status(500).json({ error: 'Failed to fetch savings goals.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, category, targetAmount, currentAmount, targetDate, status, notes } = req.body;
    if (!name?.trim() || !isPositiveAmount(targetAmount) || (targetDate && !isValidDate(targetDate))) return res.status(400).json({ error: 'Goal name, positive target amount, and valid target date are required.' });
    const goalId = id || `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query('INSERT INTO savings_goals (id,user_id,name,category,target_amount,current_amount,target_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [goalId, req.userId, name.trim(), category || 'Custom Savings Goal', Math.max(0, Number(targetAmount)), Math.max(0, Number(currentAmount) || 0), targetDate || null, status || 'Active', notes]);
    res.status(201).json(formatGoal(result.rows[0]));
  } catch (error) { console.error('Create savings goal error:', error); res.status(500).json({ error: 'Failed to create savings goal.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, targetAmount, targetDate, status, notes } = req.body;
    if (targetAmount !== undefined && !isPositiveAmount(targetAmount)) return res.status(400).json({ error: 'Target amount must be greater than zero.' });
    if (targetDate !== undefined && targetDate && !isValidDate(targetDate)) return res.status(400).json({ error: 'Target date must be valid YYYY-MM-DD.' });
    const result = await query('UPDATE savings_goals SET name=COALESCE($3,name), category=COALESCE($4,category), target_amount=COALESCE($5,target_amount), target_date=COALESCE($6,target_date), status=COALESCE($7,status), notes=$8, updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.userId, name?.trim(), category, targetAmount, targetDate || null, status, notes]);
    if (!result.rows.length) return res.status(404).json({ error: 'Savings goal not found.' });
    res.json(formatGoal(result.rows[0]));
  } catch (error) { console.error('Update savings goal error:', error); res.status(500).json({ error: 'Failed to update savings goal.' }); }
});

router.post('/:id/transactions', async (req, res) => {
  let client;
  try {
    const { id, date, amount, transactionType, notes } = req.body;
    if (!isPositiveAmount(amount) || !['contribution', 'withdrawal'].includes(transactionType) || !isValidDate(date)) return res.status(400).json({ error: 'Valid date, positive amount, and contribution/withdrawal type are required.' });
    client = await pool.connect();
    await client.query('BEGIN');
    const goalResult = await client.query('SELECT * FROM savings_goals WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id, req.userId]);
    if (!goalResult.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Savings goal not found.' }); }
    const goal = goalResult.rows[0];
    const delta = transactionType === 'withdrawal' ? -Number(amount) : Number(amount);
    const nextAmount = Number(goal.current_amount) + delta;
    if (nextAmount < 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Withdrawal cannot exceed the current saved amount.' }); }
    const txId = id || `goal-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await client.query('INSERT INTO savings_goal_transactions (id,user_id,goal_id,date,amount,transaction_type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)', [txId, req.userId, req.params.id, date, amount, transactionType, notes]);
    const updated = await client.query('UPDATE savings_goals SET current_amount=$3, updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.userId, nextAmount]);
    await client.query('COMMIT');
    res.status(201).json(formatGoal(updated.rows[0]));
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); console.error('Record savings goal transaction error:', error); res.status(500).json({ error: 'Failed to record goal transaction.' }); }
  finally { client?.release(); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Savings goal not found.' });
    res.json({ message: 'Savings goal deleted.', id: req.params.id });
  } catch (error) { console.error('Delete savings goal error:', error); res.status(500).json({ error: 'Failed to delete savings goal.' }); }
});

export default router;
