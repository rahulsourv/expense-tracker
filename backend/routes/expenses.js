import { Router } from 'express';
import pool, { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';
import { isPositiveAmount, isValidDate } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/expenses
 * Get all expenses for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.userId]
    );

    res.json(result.rows.map(formatExpense));
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

/**
 * POST /api/expenses
 * Create a new expense
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, amount, category, type, transactionKind, date, paymentMethod, accountName, receiptReference, notes, isRecurring, linkedBillId, cardId, merchant, tags, currency } = req.body;

    if (!name?.trim() || !isPositiveAmount(amount) || !isValidDate(date)) {
      return res.status(400).json({ error: 'Expense name, positive amount, and valid date are required.' });
    }

    const expenseId = id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const result = await query(
      `INSERT INTO expenses (id, user_id, name, amount, category, type, transaction_kind, date, payment_method, account_name, receipt_reference, notes, is_recurring, linked_bill_id, card_id, merchant, tags, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [expenseId, req.userId, name, amount, category, type || 'Essential', ['expense', 'refund'].includes(transactionKind) ? transactionKind : 'expense', date, paymentMethod, accountName, receiptReference, notes, isRecurring || false, linkedBillId, cardId, merchant || null, JSON.stringify(Array.isArray(tags) ? tags : []), currency || '₹']
    );

    res.status(201).json(formatExpense(result.rows[0]));
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense.' });
  }
});

/**
 * DELETE /api/expenses/all
 * Delete only the authenticated user's expense records.
 */
router.delete('/all', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM expenses WHERE user_id = $1 RETURNING id',
      [req.userId]
    );
    res.json({ message: 'All expenses deleted.', count: result.rowCount });
  } catch (error) {
    console.error('Delete all expenses error:', error);
    res.status(500).json({ error: 'Failed to delete all expenses.' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update an expense
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, amount, category, type, transactionKind, date, paymentMethod, accountName, receiptReference, notes, isRecurring, linkedBillId, cardId, merchant, tags, currency } = req.body;

    if (amount !== undefined && amount !== null && !isPositiveAmount(amount)) {
      return res.status(400).json({ error: 'Expense amount must be greater than zero.' });
    }
    if (date !== undefined && date !== null && !isValidDate(date)) {
      return res.status(400).json({ error: 'Expense date must be a valid YYYY-MM-DD date.' });
    }

    const result = await query(
      `UPDATE expenses SET
        name = COALESCE($3, name),
        amount = COALESCE($4, amount),
        category = COALESCE($5, category),
        type = COALESCE($6, type),
        transaction_kind = COALESCE($7, transaction_kind),
        date = COALESCE($8, date),
        payment_method = COALESCE($9, payment_method),
        account_name = COALESCE($10, account_name),
        receipt_reference = COALESCE($11, receipt_reference),
        notes = COALESCE($12, notes),
        is_recurring = COALESCE($13, is_recurring),
        linked_bill_id = $14,
        card_id = $15,
        merchant = COALESCE($16, merchant),
        tags = COALESCE($17, tags),
        currency = COALESCE($18, currency)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, name, amount, category, type, transactionKind && ['expense', 'refund'].includes(transactionKind) ? transactionKind : undefined, date, paymentMethod, accountName, receiptReference, notes, isRecurring, linkedBillId, cardId, merchant, tags === undefined ? null : JSON.stringify(Array.isArray(tags) ? tags : []), currency]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json(formatExpense(result.rows[0]));
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

/**
 * POST /api/expenses/bulk
 * Bulk upsert expenses (used during data restore/import)
 */
router.post('/bulk', async (req, res) => {
  let client;
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) {
      return res.status(400).json({ error: 'expenses must be an array.' });
    }

    // Validate the entire payload before changing existing data.
    const invalidIndex = expenses.findIndex((exp) => (
      !exp?.id || !exp?.name?.trim() || !isPositiveAmount(exp.amount) || !isValidDate(exp.date)
    ));
    if (invalidIndex !== -1) {
      return res.status(400).json({ error: `Expense at row ${invalidIndex + 1} is invalid. Every row needs an id, name, positive amount, and valid date.` });
    }

    // Replace atomically so a failed insert can never leave a half-restored account.
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM expenses WHERE user_id = $1', [req.userId]);

    for (const exp of expenses) {
      await client.query(
        `INSERT INTO expenses (id, user_id, name, amount, category, type, transaction_kind, date, payment_method, account_name, receipt_reference, notes, is_recurring, linked_bill_id, card_id, merchant, tags, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          exp.id, req.userId, exp.name, exp.amount, exp.category, exp.type || 'Essential', ['expense', 'refund'].includes(exp.transactionKind) ? exp.transactionKind : 'expense',
          exp.date, exp.paymentMethod, exp.accountName, exp.receiptReference, exp.notes, exp.isRecurring || false, exp.linkedBillId, exp.cardId, exp.merchant || null, JSON.stringify(Array.isArray(exp.tags) ? exp.tags : []), exp.currency || '₹',
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `${expenses.length} expenses imported.` });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Bulk expenses error:', error);
    res.status(500).json({ error: 'Failed to import expenses.' });
  } finally { client?.release(); }
});

function formatExpense(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount) || 0,
    category: row.category,
    type: row.type,
    transactionKind: row.transaction_kind || 'expense',
    date: toDateString(row.date),
    paymentMethod: row.payment_method,
    accountName: row.account_name,
    receiptReference: row.receipt_reference,
    notes: row.notes,
    isRecurring: row.is_recurring,
    linkedBillId: row.linked_bill_id,
    cardId: row.card_id,
    merchant: row.merchant || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    currency: row.currency || '₹',
  };
}

export default router;
