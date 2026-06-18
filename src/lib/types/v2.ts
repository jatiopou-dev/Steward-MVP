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

// M2 Finance types

export type AppealStatus = 'active' | 'archived';
export type DonorStatus = 'active' | 'archived';
export type BankAccountStatus = 'active' | 'archived';

export interface Appeal {
  id: string;
  organisation_id: string;
  code: string;
  name: string;
  description: string | null;
  external_account_code: string | null;
  status: AppealStatus;
  created_at: string;
  updated_at: string;
}

export interface Donor {
  id: string;
  organisation_id: string;
  display_name: string;
  email: string | null;
  external_reference: string | null;
  gift_aid_eligible: boolean;
  status: DonorStatus;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  organisation_id: string;
  name: string;
  account_last4: string | null;
  currency: string;
  status: BankAccountStatus;
  created_at: string;
}

// M3 Donation import types

export type ImportSource = 'bank_csv' | 'stripe';
export type ImportBatchStatus = 'processing' | 'complete' | 'failed';
export type DonationStatus = 'imported' | 'matched' | 'reconciled';

export interface DonationImportBatch {
  id: string;
  organisation_id: string;
  bank_account_id: string | null;
  source: ImportSource;
  filename: string;
  row_count: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  status: ImportBatchStatus;
  raw_headers: Record<string, string> | null;
  created_by: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  organisation_id: string;
  import_batch_id: string | null;
  appeal_id: string | null;
  donor_id: string | null;
  source: ImportSource;
  source_reference: string;
  amount_pence: number;
  currency: string;
  transaction_date: string;
  description: string | null;
  raw_row: Record<string, unknown>;
  status: DonationStatus;
  created_at: string;
}

export interface ImportRowResult {
  source_reference: string;
  status: 'imported' | 'skipped' | 'error';
  error?: string;
}

export interface ImportBatchResult {
  batch_id: string;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  rows: ImportRowResult[];
}
