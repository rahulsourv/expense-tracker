import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';

const router = Router();
router.use(authenticate);

const formatLoan = (row) => ({
  id: row.id,
  name: row.name,
  loanType: row.loan_type,
  principalAmount: Number(row.principal_amount) || 0,
  outstandingPrincipal: Number(row.outstanding_principal) || 0,
  interestRate: Number(row.interest_rate) || 0,
  tenureMonths: Number(row.tenure_months) || 0,
  emiAmount: Number(row.emi_amount) || 0,
  dueDay: Number(row.due_day) || 5,
  startDate: toDateString(row.start_date),
  status: row.status || 'Active',
  paidMonths: row.paid_months || {},
  notes: row.notes,
});

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM loans WHERE user_id = $1 ORDER BY status ASC, due_day ASC, created_at DESC', [req.userId]);
    res.json(result.rows.map(formatLoan));
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, loanType, principalAmount, outstandingPrincipal, interestRate, tenureMonths, emiAmount, dueDay, startDate, status, paidMonths, notes } = req.body;
    const loanId = id || `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await query(
      `INSERT INTO loans (id, user_id, name, loan_type, principal_amount, outstanding_principal, interest_rate, tenure_months, emi_amount, due_day, start_date, status, paid_months, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [loanId, req.userId, name, loanType || 'Bank Loan', principalAmount || 0, outstandingPrincipal || 0, interestRate || 0, tenureMonths || 0, emiAmount || 0, dueDay || 5, startDate, status || 'Active', JSON.stringify(paidMonths || {}), notes]
    );
    res.status(201).json(formatLoan(result.rows[0]));
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, loanType, principalAmount, outstandingPrincipal, interestRate, tenureMonths, emiAmount, dueDay, startDate, status, paidMonths, notes } = req.body;
    const result = await query(
      `UPDATE loans SET name=COALESCE($3,name), loan_type=COALESCE($4,loan_type), principal_amount=COALESCE($5,principal_amount), outstanding_principal=COALESCE($6,outstanding_principal), interest_rate=COALESCE($7,interest_rate), tenure_months=COALESCE($8,tenure_months), emi_amount=COALESCE($9,emi_amount), due_day=COALESCE($10,due_day), start_date=COALESCE($11,start_date), status=COALESCE($12,status), paid_months=COALESCE($13,paid_months), notes=COALESCE($14,notes)
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.userId, name, loanType, principalAmount, outstandingPrincipal, interestRate, tenureMonths, emiAmount, dueDay, startDate, status, paidMonths ? JSON.stringify(paidMonths) : null, notes]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Loan not found.' });
    res.json(formatLoan(result.rows[0]));
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ error: 'Failed to update loan.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM loans WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Loan not found.' });
    res.json({ message: 'Loan deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ error: 'Failed to delete loan.' });
  }
});

export default router;
