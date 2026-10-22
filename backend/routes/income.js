import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';
import { isPositiveAmount, isValidDate } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

const formatIncome = (row) => ({
  id: row.id,
  name: row.name,
  amount: Number(row.amount) || 0,
  category: row.category,
  date: toDateString(row.date),
  paymentMethod: row.payment_method,
  notes: row.notes,
});

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM income_entries WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]);
    res.json(result.rows.map(formatIncome));
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to fetch income entries.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, amount, category, date, paymentMethod, notes } = req.body;
    if (!name?.trim() || !isPositiveAmount(amount) || !isValidDate(date)) {
      return res.status(400).json({ error: 'Income name, positive amount, and valid date are required.' });
    }
    const incomeId = id || `income-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO income_entries (id, user_id, name, amount, category, date, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [incomeId, req.userId, name.trim(), amount, category || 'Other Income', date, paymentMethod, notes]
    );
    res.status(201).json(formatIncome(result.rows[0]));
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income entry.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, amount, category, date, paymentMethod, notes } = req.body;
    if (amount !== undefined && !isPositiveAmount(amount)) return res.status(400).json({ error: 'Income amount must be greater than zero.' });
    if (date !== undefined && !isValidDate(date)) return res.status(400).json({ error: 'Income date must be valid YYYY-MM-DD.' });
    const result = await query(
      `UPDATE income_entries SET name=COALESCE($3,name), amount=COALESCE($4,amount), category=COALESCE($5,category), date=COALESCE($6,date), payment_method=$7, notes=$8
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.userId, name?.trim(), amount, category, date, paymentMethod, notes]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Income entry not found.' });
    res.json(formatIncome(result.rows[0]));
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ error: 'Failed to update income entry.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM income_entries WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Income entry not found.' });
    res.json({ message: 'Income entry deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income entry.' });
  }
});

export default router;
