import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/savings-transfers
 * Get all savings transfers for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM savings_transfers WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.userId]
    );
    res.json(result.rows.map(formatTransfer));
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Failed to fetch savings transfers.' });
  }
});

/**
 * POST /api/savings-transfers
 * Create a new savings transfer
 */
router.post('/', async (req, res) => {
  try {
    const { id, date, amount, sourceAccount, destinationAccount, notes } = req.body;

    const transferId = id || `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const result = await query(
      `INSERT INTO savings_transfers (id, user_id, date, amount, source_account, destination_account, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [transferId, req.userId, date, amount, sourceAccount, destinationAccount, notes]
    );

    res.status(201).json(formatTransfer(result.rows[0]));
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Failed to create savings transfer.' });
  }
});

/**
 * DELETE /api/savings-transfers/:id
 * Delete a savings transfer
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM savings_transfers WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found.' });
    }

    res.json({ message: 'Savings transfer deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({ error: 'Failed to delete savings transfer.' });
  }
});

/**
 * POST /api/savings-transfers/bulk
 * Bulk upsert savings transfers (for data restore)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { savingsTransfers } = req.body;
    if (!Array.isArray(savingsTransfers)) {
      return res.status(400).json({ error: 'savingsTransfers must be an array.' });
    }

    await query('DELETE FROM savings_transfers WHERE user_id = $1', [req.userId]);

    for (const t of savingsTransfers) {
      await query(
        `INSERT INTO savings_transfers (id, user_id, date, amount, source_account, destination_account, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [t.id, req.userId, t.date, t.amount, t.sourceAccount, t.destinationAccount, t.notes]
      );
    }

    res.json({ message: `${savingsTransfers.length} transfers imported.` });
  } catch (error) {
    console.error('Bulk transfers error:', error);
    res.status(500).json({ error: 'Failed to import savings transfers.' });
  }
});

function formatTransfer(row) {
  return {
    id: row.id,
    date: toDateString(row.date),
    amount: Number(row.amount) || 0,
    sourceAccount: row.source_account,
    destinationAccount: row.destination_account,
    notes: row.notes,
  };
}

export default router;
