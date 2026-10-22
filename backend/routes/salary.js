import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/salary
 * Get salary & allocation data for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM salary_data WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create default entry if not exists
      const insertResult = await query(
        `INSERT INTO salary_data (user_id) VALUES ($1) RETURNING *`,
        [req.userId]
      );
      return res.json(formatSalaryData(insertResult.rows[0]));
    }

    res.json(formatSalaryData(result.rows[0]));
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ error: 'Failed to fetch salary data.' });
  }
});

/**
 * PUT /api/salary
 * Update salary & allocation data
 */
router.put('/', async (req, res) => {
  try {
    const {
      monthlySalary,
      investmentsAllocation,
      essentialBudget,
      plannedSavings,
      thresholds,
      categoryBudgets,
      currency,
    } = req.body;

    const result = await query(
      `UPDATE salary_data SET
        monthly_salary = COALESCE($2, monthly_salary),
        investments_allocation = COALESCE($3, investments_allocation),
        essential_budget = COALESCE($4, essential_budget),
        planned_savings = COALESCE($5, planned_savings),
        thresholds = COALESCE($6, thresholds),
        category_budgets = COALESCE($7, category_budgets),
        currency = COALESCE($8, currency),
        updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [
        req.userId,
        monthlySalary,
        investmentsAllocation,
        essentialBudget,
        plannedSavings,
        thresholds ? JSON.stringify(thresholds) : null,
        categoryBudgets ? JSON.stringify(categoryBudgets) : null,
        currency,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary data not found.' });
    }

    res.json(formatSalaryData(result.rows[0]));
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Failed to update salary data.' });
  }
});

/**
 * Format database row to frontend-compatible shape
 */
function formatSalaryData(row) {
  return {
    monthlySalary: Number(row.monthly_salary) || 0,
    investmentsAllocation: Number(row.investments_allocation) || 0,
    essentialBudget: Number(row.essential_budget) || 0,
    plannedSavings: Number(row.planned_savings) || 0,
    thresholds: row.thresholds || { green: 75, yellow: 90, orange: 100 },
    categoryBudgets: row.category_budgets || {},
    currency: row.currency || '₹',
  };
}

export default router;
