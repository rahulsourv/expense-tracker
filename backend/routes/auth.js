import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, created_at',
      [email.toLowerCase(), passwordHash, displayName || email.split('@')[0]]
    );

    const user = result.rows[0];

    // Initialize salary_data row for this user with defaults
    await query(
      `INSERT INTO salary_data (user_id, monthly_salary, investments_allocation, essential_budget, planned_savings, thresholds, category_budgets, currency)
       VALUES ($1, 0, 0, 0, 0, '{"green": 75, "yellow": 90, "orange": 100}', '{}', '₹')`,
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
