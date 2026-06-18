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

export type ImportSource = 'bank_csv' | 'stripe' | 'crypto';
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

// M4 Reconciliation types

export type PeriodStatus = 'open' | 'closed';

export interface AppealSummary {
  appeal_id: string;
  appeal_code: string;
  appeal_name: string;
  count: number;
  total_pence: number;
}

export interface ReconciliationPeriod {
  id: string;
  organisation_id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  donation_count: number;
  total_pence: number;
  summary_by_appeal: AppealSummary[] | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

// M5 Gift Aid types

export type DeclarationType = 'enduring' | 'retro' | 'single';
export type ClaimStatus = 'draft' | 'submitted';

export interface GiftAidDeclaration {
  id: string;
  organisation_id: string;
  donor_id: string;
  declaration_type: DeclarationType;
  effective_from: string;
  effective_to: string | null;
  signed_at: string;
  signed_by_name: string;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GiftAidClaim {
  id: string;
  organisation_id: string;
  claim_period_from: string;
  claim_period_to: string;
  total_donations_pence: number;
  total_gift_aid_pence: number;
  donation_count: number;
  status: ClaimStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GiftAidClaimDonation {
  claim_id: string;
  donation_id: string;
  declaration_id: string;
  gift_aid_pence: number;
}

export interface ClaimSummary {
  claim: GiftAidClaim;
  donation_count: number;
  total_donations_pence: number;
  total_gift_aid_pence: number;
}

export interface SubmitClaimResult {
  claim: GiftAidClaim;
  summary: ClaimSummary;
  csv: string;
}

// Web3 types

export interface AnchorPayload {
  steward_version: '1';
  organisation_id: string;
  period_id: string;
  year: number;
  month: number;
  total_pence: number;
  donation_count: number;
  donation_ids: string[];
  audit_log_ids: string[];
  closed_by: string;
  closed_at: string;
  prev_anchor_tx_hash: string | null;
}

export interface ChainAnchor {
  id: string;
  organisation_id: string;
  period_id: string;
  chain: 'polygon' | 'base';
  chain_id: number;
  tx_hash: string;
  block_number: number;
  anchor_hash: string;
  anchor_data: AnchorPayload;
  prev_anchor_tx_hash: string | null;
  anchored_at: string;
  anchored_by: string | null;
}
