-- Migration 005: Allow authenticated first-run organization setup.
-- Run this in your Supabase SQL Editor before testing onboarding.

CREATE POLICY "authenticated_users_can_create_organizations" ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_members_can_update_organizations" ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    id = (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "org_denomination_config_insert" ON denomination_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "org_denomination_config_update" ON denomination_config
  FOR UPDATE
  TO authenticated
  USING (
    org_id = (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE profiles.id = auth.uid())
  );
