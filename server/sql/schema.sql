-- SmartSpendr database schema (Postgres / Supabase)
-- Run this in the Supabase SQL Editor against a fresh project.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  theme VARCHAR(30) NOT NULL DEFAULT 'blue-white',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_name VARCHAR(150) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  period_months INT NOT NULL,
  bank VARCHAR(100),
  starting_month DATE NOT NULL,
  actual_saved_override DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

CREATE TABLE IF NOT EXISTS goal_months (
  id VARCHAR(36) PRIMARY KEY,
  goal_id VARCHAR(36) NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  month_number INT NOT NULL,
  month_label DATE NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  -- Actual amount saved that month (NULL = not yet recorded). When set and
  -- less than target_amount, the shortfall is added onto the next month's
  -- target_amount; rollover_to_next records how much THIS month pushed
  -- forward, so a later edit can cleanly reverse and reapply it.
  actual_amount DECIMAL(12,2) NULL,
  rollover_to_next DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_goal_months_goal ON goal_months(goal_id);

-- Expense Tracker feature

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'savings', 'debt', 'bill')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_user_category_name UNIQUE (user_id, name)
);

-- The Expense Log: every logged transaction (expense, income, savings
-- contribution, or debt/bill payment) is one row here. category.type
-- determines which section/rollup a row belongs to.
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
  txn_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  notes VARCHAR(500),
  account VARCHAR(4) NOT NULL DEFAULT 'bank' CHECK (account IN ('cash', 'bank')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- Expected (budgeted) amount per category per month. This is the only
-- manually-entered "Expected" figure; Actual is always derived from
-- the transactions table.
CREATE TABLE IF NOT EXISTS category_budgets (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
  month DATE NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_budget UNIQUE (user_id, category_id, month)
);

-- Debt & Bills tracker: recurring obligations with a due date and a
-- completion checkbox. Expected comes from category_budgets, Actual
-- from transactions -- neither is duplicated here.
CREATE TABLE IF NOT EXISTS debt_bill_items (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
  month DATE NOT NULL,
  due_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debt_bill_user_month ON debt_bill_items(user_id, month);

-- Multi-month installment debt plans: a total amount split evenly across
-- period_months, generating one debt_bill_items row per month (mirrors
-- how goals/goal_months splits a goal's target_amount across its period).
CREATE TABLE IF NOT EXISTS debt_plans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
  bank VARCHAR(100),
  total_amount DECIMAL(12,2) NOT NULL,
  period_months INT NOT NULL,
  starting_month DATE NOT NULL,
  due_day INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debt_plans_user ON debt_plans(user_id);

ALTER TABLE debt_bill_items ADD COLUMN IF NOT EXISTS plan_id VARCHAR(36) REFERENCES debt_plans(id) ON DELETE CASCADE;
ALTER TABLE debt_bill_items ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2) NULL;
ALTER TABLE debt_bill_items ADD COLUMN IF NOT EXISTS bank VARCHAR(100) NULL;

-- Registry of months the user has started tracking, plus optional manual
-- starting balance overrides for cash and bank (only meaningful for the
-- earliest month -- every later month's starting balance is carried over
-- automatically from the previous month's computed ending balance).
CREATE TABLE IF NOT EXISTS months (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  cash_starting_override DECIMAL(12,2) NULL,
  bank_starting_override DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_user_month UNIQUE (user_id, month)
);
