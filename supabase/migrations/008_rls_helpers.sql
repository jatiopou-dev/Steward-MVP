-- Migration 008: RLS helper functions
-- These functions encapsulate org membership checks for RLS policies.
-- Security definer means these run as the function owner (postgres), not the calling user.
-- set search_path = public prevents search_path injection attacks.

-- Check if the current user is an active member of the given organisation
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.organisation_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

-- Check if the current user holds one of the given roles in the organisation
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.organisation_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY(allowed_roles)
  );
$$;
