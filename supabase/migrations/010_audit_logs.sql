-- Migration 010: Audit logs table
-- Tracks changes to key entities for compliance, debugging, and forensics.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owners, admins, finance managers, and auditors can read audit logs
CREATE POLICY "privileged roles can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    public.has_org_role(
      organisation_id,
      ARRAY['owner','admin','finance_manager','auditor']
    )
  );

-- Indexes for efficient querying by organisation and time
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id_created_at ON audit_logs(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
