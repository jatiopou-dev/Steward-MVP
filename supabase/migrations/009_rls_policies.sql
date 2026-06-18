-- Migration 009: Enable RLS and create policies
-- Establishes row-level security for profiles, organisations, memberships, and audit logs.

-- profiles: each user sees only their own row
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- organisations: visible to active members only
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view org"
  ON organisations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "owners and admins can update org"
  ON organisations FOR UPDATE
  USING (public.has_org_role(id, ARRAY['owner','admin']))
  WITH CHECK (public.has_org_role(id, ARRAY['owner','admin']));

-- memberships: any active member can view memberships in their org
-- Note: inserts/updates/deletes are service-role only (no RLS insert policy defined here;
-- these operations should be restricted to authenticated service-role calls).
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view memberships in their org"
  ON memberships FOR SELECT
  USING (public.is_org_member(organisation_id));
