// Database initialization script - creates all tables
// Run with: npm run db:init

import dotenv from 'dotenv';
dotenv.config();

import { query } from './pool.js';

const initSQL = `
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary & budget allocation data (one row per user)
CREATE TABLE IF NOT EXISTS salary_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(12,2) DEFAULT 0,
  investments_allocation NUMERIC(12,2) DEFAULT 0,
  essential_budget NUMERIC(12,2) DEFAULT 0,
  planned_savings NUMERIC(12,2) DEFAULT 0,
  thresholds JSONB DEFAULT '{"green": 75, "yellow": 90, "orange": 100}',
  category_budgets JSONB DEFAULT '{}',
  currency VARCHAR(10) DEFAULT '₹',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  type VARCHAR(20) DEFAULT 'Essential',
  transaction_kind VARCHAR(20) DEFAULT 'expense',
  date DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  linked_bill_id VARCHAR(100),
  card_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional income entries (salary remains the baseline budget input)
CREATE TABLE IF NOT EXISTS income_entries (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'Other Income',
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards used to identify and track card-based expenses
CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(150),
  card_type VARCHAR(20) DEFAULT 'Credit',
  last_four VARCHAR(4) NOT NULL,
  billing_day INTEGER,
  due_day INTEGER,
  credit_limit NUMERIC(14,2) DEFAULT 0,
  outstanding_amount NUMERIC(14,2) DEFAULT 0,
  color VARCHAR(30) DEFAULT 'yellow',
  notes TEXT,
  card_number TEXT,
  expiry_date VARCHAR(7),
  cvv TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(7);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cvv TEXT;

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'Other Account',
  opening_balance NUMERIC(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS card_payments (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id VARCHAR(100) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(50),
  account_name VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_id VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS account_name VARCHAR(150);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_reference TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS transaction_kind VARCHAR(20) DEFAULT 'expense';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS merchant VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '₹';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS linked_bill_id VARCHAR(100);

-- Recurring bills table
CREATE TABLE IF NOT EXISTS bills (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  expected_amount NUMERIC(12,2) DEFAULT 0,
  category VARCHAR(100),
  due_date DATE,
  frequency VARCHAR(20) DEFAULT 'Monthly',
  is_paid BOOLEAN DEFAULT FALSE,
  actual_amount_paid NUMERIC(12,2) DEFAULT 0,
  payment_date DATE,
  linked_expense_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  quantity NUMERIC(14,4) DEFAULT 0,
  monthly_contribution NUMERIC(12,2) DEFAULT 0,
  actual_contributions JSONB DEFAULT '{}',
  total_invested NUMERIC(14,2) DEFAULT 0,
  current_value NUMERIC(14,2) DEFAULT 0,
  start_date DATE,
  expected_roi NUMERIC(6,2) DEFAULT 0,
  tenure_years INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE investments ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4) DEFAULT 0;

-- Recurring-bill lifecycle metadata (safe for existing databases)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS renew_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_months JSONB DEFAULT '{}';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS amount_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_account VARCHAR(255);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 3;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS end_date DATE;

-- Savings transfers table
CREATE TABLE IF NOT EXISTS savings_transfers (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE,
  amount NUMERIC(12,2) DEFAULT 0,
  source_account VARCHAR(255),
  destination_account VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings goals and their contribution/withdrawal history
CREATE TABLE IF NOT EXISTS savings_goals (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Custom Savings Goal',
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date DATE,
  status VARCHAR(20) DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_goal_transactions (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id VARCHAR(100) NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_key VARCHAR(7) NOT NULL,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) DEFAULT '₹',
  date_format VARCHAR(30) DEFAULT 'YYYY-MM-DD',
  month_start_day INTEGER DEFAULT 1,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'neo-brutalist',
  budget_warning_threshold INTEGER DEFAULT 80,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS budget_warning_threshold INTEGER DEFAULT 80;

-- Loans and monthly EMI tracking
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(30) DEFAULT 'Bank Loan',
  principal_amount NUMERIC(14,2) DEFAULT 0,
  outstanding_principal NUMERIC(14,2) DEFAULT 0,
  interest_rate NUMERIC(6,2) DEFAULT 0,
  tenure_months INTEGER DEFAULT 0,
  emi_amount NUMERIC(12,2) DEFAULT 0,
  due_day INTEGER DEFAULT 5,
  start_date DATE,
  status VARCHAR(20) DEFAULT 'Active',
  paid_months JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom categories table
CREATE TABLE IF NOT EXISTS custom_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  parent_category VARCHAR(100) DEFAULT 'Custom',
  transaction_type VARCHAR(20) DEFAULT 'expense',
  icon VARCHAR(50) DEFAULT 'Tag',
  color VARCHAR(30) DEFAULT 'yellow',
  monthly_budget NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS parent_category VARCHAR(100) DEFAULT 'Custom';
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'expense';
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Tag';
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS color VARCHAR(30) DEFAULT 'yellow';
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_card_payments_card_id ON card_payments(card_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transfers_user_id ON savings_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goal_transactions_goal_id ON savings_goal_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_month ON cash_balances(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON custom_categories(user_id);
`;

async function init() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await query(initSQL);
    console.log('✅ All tables created successfully!');
    console.log('📦 Database is ready for NYNET.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

init();
