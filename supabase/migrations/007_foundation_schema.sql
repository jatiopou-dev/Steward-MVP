-- Migration 007: Add foundation schema for multi-tenant architecture
-- Safe to run alongside existing prototype tables (organizations, members, etc.)
-- This establishes the new UK-spelling organisational hierarchy (organisations, memberships).

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extend profiles with updated_at (safe: add if not exists)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- organisations table (UK spelling, distinct from prototype 'organizations')
-- Establishes a hierarchical org structure with parent_organisation_id for
-- denominations, networks, and conferences.
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('denomination','network','conference','church','ministry')),
  parent_organisation_id UUID REFERENCES organisations(id),
  country TEXT DEFAULT 'GB',
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- memberships: joins users to organisations with a role
-- Replaces the single-org-per-user model in profiles.org_id with
-- a flexible many-to-many relationship via roles.
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','finance_manager','finance_assistant','viewer','auditor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','disabled')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  constraint unique_user_org unique (user_id, organisation_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_organisations_parent_id ON organisations(parent_organisation_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON memberships(organisation_id);
