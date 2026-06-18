export type OrgType = 'denomination' | 'network' | 'conference' | 'church' | 'ministry';
export type OrgStatus = 'active' | 'archived' | 'suspended';
// 'owner' is set only at org creation. inviteMemberSchema and updateMemberRoleSchema exclude it.
export type MemberRole = 'owner' | 'admin' | 'finance_manager' | 'finance_assistant' | 'viewer' | 'auditor';
export type MemberStatus = 'invited' | 'active' | 'disabled';

export interface Organisation {
  id: string;
  name: string;
  type: OrgType;
  parent_organisation_id: string | null;
  country: string;
  currency: string;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organisation_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { error: string; data?: never };
