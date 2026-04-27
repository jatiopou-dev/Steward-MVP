-- Migration 002: Create church members table
-- Run this in your Supabase SQL Editor.
-- NOTE: This is for CHURCH MEMBERS (congregation), not app users (profiles).

CREATE TABLE IF NOT EXISTS members (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Name
  title                     TEXT,                     -- Mr, Mrs, Dr, Rev, etc.
  first_name                TEXT NOT NULL,
  last_name                 TEXT NOT NULL,

  -- Contact
  email                     TEXT,
  phone                     TEXT,

  -- Address (needed for HMRC Gift Aid)
  address_line1             TEXT,
  postcode                  TEXT,

  -- Membership details
  status                    TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'inactive' | 'transfer_in' | 'transfer_out' | 'deceased'
  joined_date               DATE,
  baptism_date              DATE,

  -- Gift Aid
  is_gift_aid_eligible      BOOLEAN NOT NULL DEFAULT false,
  gift_aid_declaration_date DATE,

  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-Level Security: users can only see members from their own org
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON members
  FOR SELECT USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_insert" ON members
  FOR INSERT WITH CHECK (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_update" ON members
  FOR UPDATE USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_delete" ON members
  FOR DELETE USING (
    org_id = (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS members_org_id_idx ON members (org_id);
