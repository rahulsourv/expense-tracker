import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const formatSettings = (row) => ({
  currency: row.currency || '₹',
  dateFormat: row.date_format || 'YYYY-MM-DD',
  monthStartDay: Number(row.month_start_day) || 1,
  notificationsEnabled: row.notifications_enabled !== false,
  theme: row.theme || 'neo-brutalist',
  budgetWarningThreshold: Number(row.budget_warning_threshold) || 80,
});

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM user_settings WHERE user_id=$1', [req.userId]);
    if (!result.rows.length) return res.json(formatSettings({}));
    res.json(formatSettings(result.rows[0]));
  } catch (error) { console.error('Get settings error:', error); res.status(500).json({ error: 'Failed to fetch settings.' }); }
});

router.put('/', async (req, res) => {
  try {
    const { currency, dateFormat, monthStartDay, notificationsEnabled, theme, budgetWarningThreshold } = req.body;
    const validCurrencies = ['₹', '$', '€', '£', '¥'];
    const validFormats = ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY'];
    if (currency !== undefined && !validCurrencies.includes(currency)) return res.status(400).json({ error: 'Unsupported currency.' });
    if (dateFormat !== undefined && !validFormats.includes(dateFormat)) return res.status(400).json({ error: 'Unsupported date format.' });
    if (monthStartDay !== undefined && (!Number.isInteger(Number(monthStartDay)) || Number(monthStartDay) < 1 || Number(monthStartDay) > 28)) return res.status(400).json({ error: 'Month start day must be between 1 and 28.' });
    if (budgetWarningThreshold !== undefined && (!Number.isInteger(Number(budgetWarningThreshold)) || Number(budgetWarningThreshold) < 50 || Number(budgetWarningThreshold) > 100)) return res.status(400).json({ error: 'Budget warning threshold must be between 50 and 100.' });
    const result = await query(`INSERT INTO user_settings (user_id,currency,date_format,month_start_day,notifications_enabled,theme,budget_warning_threshold)
      VALUES ($1,COALESCE($2,'₹'),COALESCE($3,'YYYY-MM-DD'),COALESCE($4,1),COALESCE($5,TRUE),COALESCE($6,'neo-brutalist'),COALESCE($7,80))
      ON CONFLICT (user_id) DO UPDATE SET currency=COALESCE($2,user_settings.currency), date_format=COALESCE($3,user_settings.date_format), month_start_day=COALESCE($4,user_settings.month_start_day), notifications_enabled=COALESCE($5,user_settings.notifications_enabled), theme=COALESCE($6,user_settings.theme), budget_warning_threshold=COALESCE($7,user_settings.budget_warning_threshold), updated_at=NOW()
      RETURNING *`, [req.userId, currency, dateFormat, monthStartDay === undefined ? null : Number(monthStartDay), notificationsEnabled, theme, budgetWarningThreshold === undefined ? null : Number(budgetWarningThreshold)]);
    res.json(formatSettings(result.rows[0]));
  } catch (error) { console.error('Save settings error:', error); res.status(500).json({ error: 'Failed to save settings.' }); }
});

export default router;
