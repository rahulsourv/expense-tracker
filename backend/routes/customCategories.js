import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/custom-categories
 * Get all custom categories for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT name FROM custom_categories WHERE user_id = $1 AND COALESCE(active, TRUE) = TRUE ORDER BY name ASC',
      [req.userId]
    );
    res.json(result.rows.map((r) => r.name));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch custom categories.' });
  }
});

router.get('/details', async (req, res) => {
  try {
    const result = await query('SELECT * FROM custom_categories WHERE user_id=$1 AND COALESCE(active,TRUE)=TRUE ORDER BY parent_category ASC, name ASC', [req.userId]);
    res.json(result.rows.map(formatCategory));
  } catch (error) { console.error('Get category details error:', error); res.status(500).json({ error: 'Failed to fetch category details.' }); }
});

/**
 * POST /api/custom-categories
 * Add a new custom category
 */
router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const { parentCategory, transactionType, icon, color, monthlyBudget, description } = req.body || {};
    if (!name || name.length > 100) {
      return res.status(400).json({ error: 'Category name is required and must be 100 characters or fewer.' });
    }

    const existing = await query('SELECT * FROM custom_categories WHERE user_id=$1 AND name=$2', [req.userId, name]);
    if (existing.rows.length && existing.rows[0].active !== false) return res.status(409).json({ error: 'A category with this name already exists.' });
    const result = await query(
      `INSERT INTO custom_categories (user_id,name,parent_category,transaction_type,icon,color,monthly_budget,description,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
       ON CONFLICT (user_id,name) DO UPDATE SET parent_category=EXCLUDED.parent_category, transaction_type=EXCLUDED.transaction_type, icon=EXCLUDED.icon, color=EXCLUDED.color, monthly_budget=EXCLUDED.monthly_budget, description=EXCLUDED.description, active=TRUE
       RETURNING *`,
      [req.userId, name, String(parentCategory || 'Custom').trim().slice(0, 100), transactionType === 'income' ? 'income' : 'expense', icon || 'Tag', color || 'yellow', Math.max(0, Number(monthlyBudget) || 0), description || null]
    );

    if (!result.rowCount) return res.status(409).json({ error: 'A category with this name already exists.' });
    res.status(201).json({ message: 'Category added.', name, category: formatCategory(result.rows[0]) });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to add category.' });
  }
});

// Rename only the category metadata. Existing transactions retain their original
// category name so historical reports remain stable and auditable.
router.put('/:name', async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const newName = String(req.body?.name || '').trim();
    const { parentCategory, transactionType, icon, color, monthlyBudget, description, active } = req.body || {};
    if (!newName || newName.length > 100) return res.status(400).json({ error: 'New category name is required and must be 100 characters or fewer.' });
    if (oldName === newName && parentCategory === undefined && transactionType === undefined && icon === undefined && color === undefined && monthlyBudget === undefined && description === undefined && active === undefined) return res.json({ message: 'Category unchanged.', oldName, name: newName });
    const result = await query(
      `UPDATE custom_categories SET name=$3, parent_category=COALESCE($4,parent_category), transaction_type=COALESCE($5,transaction_type), icon=COALESCE($6,icon), color=COALESCE($7,color), monthly_budget=COALESCE($8,monthly_budget), description=COALESCE($9,description), active=COALESCE($10,active)
       WHERE user_id=$1 AND name=$2 RETURNING *`,
      [req.userId, oldName, newName, parentCategory, transactionType === 'income' ? 'income' : (transactionType === undefined ? undefined : 'expense'), icon, color, monthlyBudget === undefined ? undefined : Math.max(0, Number(monthlyBudget) || 0), description, active]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Custom category not found.' });
    res.json({ message: 'Category updated.', oldName, name: result.rows[0].name, category: formatCategory(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A category with this name already exists.' });
    console.error('Rename category error:', error);
    res.status(500).json({ error: 'Failed to rename category.' });
  }
});

// Archive a custom category from future forms without changing historical transactions.
router.delete('/:name', async (req, res) => {
  try {
    const result = await query(
      'UPDATE custom_categories SET active = FALSE WHERE user_id = $1 AND name = $2 AND COALESCE(active, TRUE) = TRUE RETURNING name',
      [req.userId, decodeURIComponent(req.params.name)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Custom category not found.' });
    res.json({ message: 'Category archived.', name: result.rows[0].name });
  } catch (error) {
    console.error('Archive category error:', error);
    res.status(500).json({ error: 'Failed to archive custom category.' });
  }
});

/**
 * POST /api/custom-categories/bulk
 * Bulk replace custom categories (for data restore)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories must be an array.' });
    }

    await query('DELETE FROM custom_categories WHERE user_id = $1', [req.userId]);

    for (const name of categories) {
      await query(
        'INSERT INTO custom_categories (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING',
        [req.userId, name]
      );
    }

    res.json({ message: `${categories.length} categories imported.` });
  } catch (error) {
    console.error('Bulk categories error:', error);
    res.status(500).json({ error: 'Failed to import categories.' });
  }
});

export default router;

function formatCategory(row) {
  return { id: row.id, name: row.name, parentCategory: row.parent_category || 'Custom', transactionType: row.transaction_type || 'expense', icon: row.icon || 'Tag', color: row.color || 'yellow', monthlyBudget: Number(row.monthly_budget) || 0, description: row.description || '', active: row.active !== false };
}
