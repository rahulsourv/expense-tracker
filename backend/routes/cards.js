import { Router } from 'express';
import pool, { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [result, paymentsResult] = await Promise.all([
      query('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]),
      query('SELECT * FROM card_payments WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]),
    ]);
    res.json(result.rows.map((row) => formatCard(row, paymentsResult.rows.filter((payment) => payment.card_id === row.id).map(formatPayment))));
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards.' });
  }
});

router.post('/:id/payments', async (req, res) => {
  let client;
  try {
    const { id, date, amount, paymentMethod, accountName, notes } = req.body;
    if (!date || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ error: 'Valid payment date and positive amount are required.' });
    client = await pool.connect();
    await client.query('BEGIN');
    const cardResult = await client.query('SELECT * FROM cards WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id, req.userId]);
    if (!cardResult.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Card not found.' }); }
    const paymentId = id || `card-payment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await client.query('INSERT INTO card_payments (id,user_id,card_id,date,amount,payment_method,account_name,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [paymentId, req.userId, req.params.id, date, amount, paymentMethod, accountName, notes]);
    const nextOutstanding = Math.max(0, Number(cardResult.rows[0].outstanding_amount || 0) - Number(amount));
    const updated = await client.query('UPDATE cards SET outstanding_amount=$3 WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.userId, nextOutstanding]);
    await client.query('COMMIT');
    res.status(201).json(formatCard(updated.rows[0], [{ id: paymentId, date, amount: Number(amount), paymentMethod, accountName, notes }]));
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); console.error('Record card payment error:', error); res.status(500).json({ error: 'Failed to record card payment.' }); }
  finally { client?.release(); }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, bankName, cardType, lastFour, color, notes } = req.body;
    const normalizedLastFour = String(lastFour || '').replace(/\D/g, '').slice(-4);
    if (!name?.trim() || normalizedLastFour.length !== 4) {
      return res.status(400).json({ error: 'Card name and exactly 4 last digits are required.' });
    }
    const cardId = id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO cards (id, user_id, name, bank_name, card_type, last_four, color, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cardId, req.userId, name.trim(), bankName, cardType || 'Credit', normalizedLastFour, color || 'yellow', notes]
    );
    res.status(201).json(formatCard(result.rows[0]));
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, bankName, cardType, lastFour, color, notes } = req.body;
    const normalizedLastFour = String(lastFour || '').replace(/\D/g, '').slice(-4);
    const result = await query(
      `UPDATE cards SET name = COALESCE($3,name), bank_name = $4, card_type = COALESCE($5,card_type),
       last_four = COALESCE($6,last_four), color = COALESCE($7,color), notes = $8
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, name?.trim(), bankName, cardType, normalizedLastFour.length === 4 ? normalizedLastFour : undefined, color, notes]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found.' });
    res.json(formatCard(result.rows[0]));
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found.' });
    await query('UPDATE expenses SET card_id = NULL WHERE card_id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Card deleted.' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card.' });
  }
});

function formatPayment(row) {
  return { id: row.id, date: row.date?.toISOString?.().slice(0, 10) || row.date, amount: Number(row.amount) || 0, paymentMethod: row.payment_method, accountName: row.account_name, notes: row.notes };
}

function formatCard(row, payments = []) {
  return {
    id: row.id,
    name: row.name,
    bankName: row.bank_name,
    cardType: row.card_type,
    lastFour: row.last_four,
    cardNumber: row.card_number || '',
    expiryDate: row.expiry_date || '',
    cvv: row.cvv || '',
    billingDay: row.billing_day,
    dueDay: row.due_day,
    creditLimit: Number(row.credit_limit) || 0,
    outstandingAmount: Number(row.outstanding_amount) || 0,
    color: row.color || 'yellow',
    notes: row.notes,
    payments,
  };
}

export default router;
