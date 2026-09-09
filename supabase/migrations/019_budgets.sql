-- Migration 019: Budget lines per fiscal year
-- Run this in your Supabase SQL Editor.
--
-- fiscal_year stores the starting calendar year of the UK charity fiscal year,
-- which runs 1 April to 31 March. FY 2026 = 1 Apr 2026 to 31 Mar 2027.
-- Actuals are derived from transactions at read time, never stored here.

CREATE TABLE IF NOT EXISTS budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  fiscal_year   INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  category      TEXT NOT NULL,
  amount_pence  BIGINT NOT NULL DEFAULT 0 CHECK (amount_pence >= 0),
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT budgets_unique_line UNIQUE (org_id, fiscal_year, category)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_budgets_select" ON budgets
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_budgets_insert" ON budgets
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_budgets_update" ON budgets
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_budgets_delete" ON budgets
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS budgets_org_id_idx ON budgets (org_id);
CREATE INDEX IF NOT EXISTS budgets_org_year_idx ON budgets (org_id, fiscal_year);
