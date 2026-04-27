-- Migration 004: Link transactions to church members for giving/Gift Aid
-- Run this in your Supabase SQL Editor.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_member_id_idx ON transactions (member_id);

