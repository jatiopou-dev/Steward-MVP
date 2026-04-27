-- Migration 001: Add description, category, and notes to transactions
-- Run this in your Supabase SQL Editor before deploying the code changes.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category    TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT;

-- Optional: back-fill a default description for any existing rows
UPDATE transactions
SET description = 'Imported transaction'
WHERE description = '';
