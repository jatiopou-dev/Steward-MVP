-- Migration 003: Create fund accounts table
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS funds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'unrestricted',
    -- 'unrestricted' | 'restricted' | 'designated'
  balance_pence BIGINT NOT NULL DEFAULT 0,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'monitor' | 'closed'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_funds_select" ON funds
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_funds_insert" ON funds
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_funds_update" ON funds
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_funds_delete" ON funds
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS funds_org_id_idx ON funds (org_id);
