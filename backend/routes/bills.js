import { Router } from 'express';
import pool, { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';
import { isPositiveAmount, isValidDate } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/bills
 * Get all recurring bills for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM bills WHERE user_id = $1 AND COALESCE(archived, FALSE) = FALSE ORDER BY due_date ASC',
      [req.userId]
    );
    res.json(result.rows.map(formatBill));
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

/**
 * POST /api/bills
 * Create a new bill
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, expectedAmount, category, dueDate, frequency, isPaid, actualAmountPaid, paymentDate, linkedExpenseId, notes, startDate, renewDate, paidMonths, archived, amountType, paymentAccount, reminderDays, endDate } = req.body;

    const billId = id || `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const result = await query(
      `INSERT INTO bills (id, user_id, name, expected_amount, category, due_date, frequency, is_paid, actual_amount_paid, payment_date, linked_expense_id, notes, start_date, renew_date, paid_months, archived, amount_type, payment_account, reminder_days, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [billId, req.userId, name, expectedAmount, category, dueDate, frequency || 'Monthly', isPaid || false, actualAmountPaid || 0, paymentDate, linkedExpenseId, notes, startDate || dueDate, renewDate || dueDate, JSON.stringify(paidMonths || {}), archived || false, amountType === 'variable' ? 'variable' : 'fixed', paymentAccount || null, Math.max(0, Number(reminderDays) || 3), endDate || null]
    );

    res.status(201).json(formatBill(result.rows[0]));
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ error: 'Failed to create bill.' });
  }
});

// Atomically record one bill payment and its linked expense. The bill/month
// pair is locked so retries and concurrent clicks cannot create duplicates.
router.post('/:id/payments', async (req, res) => {
  let client;
  try {
    const { monthKey, amount, date, paymentMethod, accountName, notes, dueDate } = req.body || {};
    if (!/^\d{4}-\d{2}$/.test(monthKey || '') || !isPositiveAmount(amount) || !isValidDate(date)) {
      return res.status(400).json({ error: 'Valid month, payment date, and positive amount are required.' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const billResult = await client.query('SELECT * FROM bills WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id, req.userId]);
    if (!billResult.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Bill not found.' }); }
    const bill = billResult.rows[0];
    const paidMonths = { ...(bill.paid_months || {}), [monthKey]: true };
    const existing = await client.query(
      `SELECT * FROM expenses WHERE user_id=$1 AND linked_bill_id=$2 AND date >= $3::date AND date < ($3::date + INTERVAL '1 month') ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [req.userId, req.params.id, `${monthKey}-01`]
    );
    let expense;
    if (existing.rows.length) {
      const updated = await client.query(
        `UPDATE expenses SET amount=$3, date=$4, payment_method=COALESCE($5,payment_method), account_name=COALESCE($6,account_name), notes=COALESCE($7,notes), is_recurring=TRUE WHERE id=$1 AND user_id=$2 RETURNING *`,
        [existing.rows[0].id, req.userId, Number(amount), date, paymentMethod, accountName, notes]
      );
      expense = updated.rows[0];
    } else {
      const expenseId = `exp-bill-${req.params.id}-${monthKey}`;
      const inserted = await client.query(
        `INSERT INTO expenses (id,user_id,name,amount,category,type,transaction_kind,date,payment_method,account_name,notes,is_recurring,linked_bill_id)
         VALUES ($1,$2,$3,$4,$5,'Essential','expense',$6,$7,$8,$9,TRUE,$10)
         ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount, date=EXCLUDED.date, payment_method=EXCLUDED.payment_method, account_name=EXCLUDED.account_name, notes=EXCLUDED.notes
         RETURNING *`,
        [expenseId, req.userId, bill.name, Number(amount), bill.category, date, paymentMethod, accountName, notes, req.params.id]
      );
      expense = inserted.rows[0];
    }
    const updatedBill = await client.query(
      `UPDATE bills SET is_paid=TRUE, actual_amount_paid=$3, payment_date=$4, linked_expense_id=$5, paid_months=$6, due_date=COALESCE($7,due_date) WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.userId, Number(amount), date, expense.id, JSON.stringify(paidMonths), dueDate || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ bill: formatBill(updatedBill.rows[0]), expense: formatExpense(expense), duplicate: existing.rows.length > 0 });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Record bill payment error:', error);
    res.status(500).json({ error: 'Failed to record bill payment.' });
  } finally { client?.release(); }
});

/**
 * PUT /api/bills/:id
 * Update a bill
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, expectedAmount, category, dueDate, frequency, isPaid, actualAmountPaid, paymentDate, linkedExpenseId, notes, startDate, renewDate, paidMonths, archived, amountType, paymentAccount, reminderDays, endDate } = req.body;

    const result = await query(
      `UPDATE bills SET
        name = COALESCE($3, name),
        expected_amount = COALESCE($4, expected_amount),
        category = COALESCE($5, category),
        due_date = COALESCE($6, due_date),
        frequency = COALESCE($7, frequency),
        is_paid = COALESCE($8, is_paid),
        actual_amount_paid = COALESCE($9, actual_amount_paid),
        payment_date = $10,
        linked_expense_id = $11,
        notes = COALESCE($12, notes),
        start_date = COALESCE($13, start_date),
        renew_date = COALESCE($14, renew_date),
        paid_months = COALESCE($15, paid_months),
        archived = COALESCE($16, archived),
        amount_type = COALESCE($17, amount_type),
        payment_account = COALESCE($18, payment_account),
        reminder_days = COALESCE($19, reminder_days),
        end_date = $20
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, name, expectedAmount, category, dueDate, frequency, isPaid, actualAmountPaid, paymentDate, linkedExpenseId, notes, startDate, renewDate, paidMonths ? JSON.stringify(paidMonths) : null, archived, amountType === undefined ? null : (amountType === 'variable' ? 'variable' : 'fixed'), paymentAccount, reminderDays === undefined ? null : Math.max(0, Number(reminderDays) || 0), endDate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    res.json(formatBill(result.rows[0]));
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

/**
 * DELETE /api/bills/:id
 * Delete a bill
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM bills WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    res.json({ message: 'Bill deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

/**
 * POST /api/bills/bulk
 * Bulk upsert bills (for data restore)
 */
router.post('/bulk', async (req, res) => {
  let client;
  try {
    const { bills } = req.body;
    if (!Array.isArray(bills)) {
      return res.status(400).json({ error: 'bills must be an array.' });
    }

    const invalidIndex = bills.findIndex((bill) => !bill?.id || !bill?.name?.trim() || (bill.dueDate && !isValidDate(bill.dueDate)) || (bill.startDate && !isValidDate(bill.startDate)));
    if (invalidIndex !== -1) return res.status(400).json({ error: `Bill at row ${invalidIndex + 1} is invalid. Every bill needs an id and name with valid dates.` });

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM bills WHERE user_id = $1', [req.userId]);

    for (const bill of bills) {
      await client.query(
        `INSERT INTO bills (id, user_id, name, expected_amount, category, due_date, frequency, is_paid, actual_amount_paid, payment_date, linked_expense_id, notes, start_date, renew_date, paid_months, archived, amount_type, payment_account, reminder_days, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          bill.id, req.userId, bill.name, bill.expectedAmount, bill.category,
          bill.dueDate, bill.frequency || 'Monthly', bill.isPaid || false,
          bill.actualAmountPaid || 0, bill.paymentDate, bill.linkedExpenseId, bill.notes,
          bill.startDate || bill.dueDate, bill.renewDate || bill.dueDate, JSON.stringify(bill.paidMonths || {}), bill.archived || false,
          bill.amountType === 'variable' ? 'variable' : 'fixed', bill.paymentAccount || null, Math.max(0, Number(bill.reminderDays) || 3), bill.endDate || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `${bills.length} bills imported.` });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Bulk bills error:', error);
    res.status(500).json({ error: 'Failed to import bills.' });
  } finally { client?.release(); }
});

function formatBill(row) {
  return {
    id: row.id,
    name: row.name,
    expectedAmount: Number(row.expected_amount) || 0,
    category: row.category,
    dueDate: toDateString(row.due_date),
    frequency: row.frequency,
    isPaid: row.is_paid,
    actualAmountPaid: Number(row.actual_amount_paid) || 0,
    paymentDate: toDateString(row.payment_date),
    linkedExpenseId: row.linked_expense_id,
    notes: row.notes,
    startDate: toDateString(row.start_date),
    renewDate: toDateString(row.renew_date),
    paidMonths: row.paid_months || {},
    archived: row.archived || false,
    amountType: row.amount_type || 'fixed',
    paymentAccount: row.payment_account || '',
    reminderDays: Number(row.reminder_days) || 3,
    endDate: toDateString(row.end_date),
  };
}

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
    notes: row.notes,
    isRecurring: row.is_recurring,
    linkedBillId: row.linked_bill_id,
    cardId: row.card_id,
  };
}

export default router;
