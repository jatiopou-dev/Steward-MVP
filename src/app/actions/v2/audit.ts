'use server';

import { createAdminClient } from '@/utils/supabase/admin';

interface AuditEntry {
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id?: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_logs').insert({
    organisation_id: entry.organisation_id,
    actor_user_id: entry.actor_user_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    previous_data: entry.previous_data ?? null,
    new_data: entry.new_data ?? null,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    // Audit log failure is logged but must not crash the main action.
    console.error('[audit] Failed to write audit log:', error.message);
  }
}
