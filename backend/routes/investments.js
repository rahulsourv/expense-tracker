import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/investments
 * Get all investments for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows.map(formatInvestment));
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Failed to fetch investments.' });
  }
});

/**
 * POST /api/investments
 * Create a new investment
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, type, quantity, monthlyContribution, actualContributions, totalInvested, currentValue, startDate, expectedRoi, tenureYears, notes } = req.body;

    const invId = id || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const result = await query(
      `INSERT INTO investments (id, user_id, name, type, quantity, monthly_contribution, actual_contributions, total_invested, current_value, start_date, expected_roi, tenure_years, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        invId, req.userId, name, type, quantity || 0, monthlyContribution || 0,
        JSON.stringify(actualContributions || {}),
        totalInvested || 0, currentValue || 0, startDate, expectedRoi || 0,
        tenureYears || 1, notes,
      ]
    );

    res.status(201).json(formatInvestment(result.rows[0]));
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({ error: 'Failed to create investment.' });
  }
});

/**
 * PUT /api/investments/:id
 * Update an investment
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, type, quantity, monthlyContribution, actualContributions, totalInvested, currentValue, startDate, expectedRoi, tenureYears, notes } = req.body;

    const result = await query(
      `UPDATE investments SET
        name = COALESCE($3, name),
        type = COALESCE($4, type),
        quantity = COALESCE($5, quantity),
        monthly_contribution = COALESCE($6, monthly_contribution),
        actual_contributions = COALESCE($7, actual_contributions),
        total_invested = COALESCE($8, total_invested),
        current_value = COALESCE($9, current_value),
        start_date = COALESCE($10, start_date),
        expected_roi = COALESCE($11, expected_roi),
        tenure_years = COALESCE($12, tenure_years),
        notes = COALESCE($13, notes)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id, req.userId, name, type, quantity, monthlyContribution,
        actualContributions ? JSON.stringify(actualContributions) : null,
        totalInvested, currentValue, startDate, expectedRoi, tenureYears, notes,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Investment not found.' });
    }

    res.json(formatInvestment(result.rows[0]));
  } catch (error) {
    console.error('Update investment error:', error);
    res.status(500).json({ error: 'Failed to update investment.' });
  }
});

/**
 * DELETE /api/investments/:id
 * Delete an investment
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Investment not found.' });
    }

    res.json({ message: 'Investment deleted.', id: req.params.id });
  } catch (error) {
    console.error('Delete investment error:', error);
    res.status(500).json({ error: 'Failed to delete investment.' });
  }
});

/**
 * POST /api/investments/bulk
 * Bulk upsert investments (for data restore)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { investments } = req.body;
    if (!Array.isArray(investments)) {
      return res.status(400).json({ error: 'investments must be an array.' });
    }

    await query('DELETE FROM investments WHERE user_id = $1', [req.userId]);

    for (const inv of investments) {
      await query(
        `INSERT INTO investments (id, user_id, name, type, quantity, monthly_contribution, actual_contributions, total_invested, current_value, start_date, expected_roi, tenure_years, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          inv.id, req.userId, inv.name, inv.type, inv.quantity || 0, inv.monthlyContribution || 0,
          JSON.stringify(inv.actualContributions || {}),
          inv.totalInvested || 0, inv.currentValue || 0,
          inv.startDate, inv.expectedRoi || 0, inv.tenureYears || 1, inv.notes,
        ]
      );
    }

    res.json({ message: `${investments.length} investments imported.` });
  } catch (error) {
    console.error('Bulk investments error:', error);
    res.status(500).json({ error: 'Failed to import investments.' });
  }
});

function formatInvestment(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    quantity: Number(row.quantity) || 0,
    monthlyContribution: Number(row.monthly_contribution) || 0,
    actualContributions: row.actual_contributions || {},
    totalInvested: Number(row.total_invested) || 0,
    currentValue: Number(row.current_value) || 0,
    startDate: toDateString(row.start_date),
    expectedRoi: Number(row.expected_roi) || 0,
    tenureYears: Number(row.tenure_years) || 1,
    notes: row.notes,
  };
}

export default router;
