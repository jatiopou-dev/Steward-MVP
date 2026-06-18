import { z } from 'zod';

export const createOrganisationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name too long'),
  type: z.enum(['denomination', 'network', 'conference', 'church', 'ministry']),
  parent_organisation_id: z.string().uuid().optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').default('GB'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('GBP'),
});

export const inviteMemberSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'finance_manager', 'finance_assistant', 'viewer', 'auditor']),
});

export const updateMemberRoleSchema = z.object({
  membership_id: z.string().uuid('Invalid membership ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  role: z.enum(['admin', 'finance_manager', 'finance_assistant', 'viewer', 'auditor']),
});

export const removeMemberSchema = z.object({
  membership_id: z.string().uuid('Invalid membership ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

// M2 Finance schemas

export const createAppealSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  code: z.string().min(1, 'Code required').max(50, 'Code too long'),
  name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  external_account_code: z.string().max(100).optional(),
});

export const updateAppealSchema = z.object({
  id: z.string().uuid('Invalid appeal ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  external_account_code: z.string().max(100).optional(),
});

export const createDonorSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  display_name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  email: z.string().email('Invalid email').optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().default(false),
});

export const updateDonorSchema = z.object({
  id: z.string().uuid('Invalid donor ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  display_name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email').optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().optional(),
});

export const createBankAccountSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  account_last4: z.string().length(4).regex(/^\d{4}$/, 'Must be exactly 4 digits').optional(),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code').default('GBP'),
});

export const updateBankAccountSchema = z.object({
  id: z.string().uuid('Invalid bank account ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type CreateAppealInput = z.infer<typeof createAppealSchema>;
export type UpdateAppealInput = z.infer<typeof updateAppealSchema>;
export type CreateDonorInput = z.infer<typeof createDonorSchema>;
export type UpdateDonorInput = z.infer<typeof updateDonorSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

// M3 Import schemas

export const createImportBatchSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  source: z.enum(['bank_csv', 'stripe']),
  filename: z.string().min(1, 'Filename required').max(255, 'Filename too long'),
  bank_account_id: z.string().uuid('Invalid bank account ID').optional(),
});

export const importDonationRowSchema = z.object({
  source_reference: z.string().min(1, 'Source reference required').max(255),
  amount_pence: z.number().int('Amount must be an integer').positive('Amount must be positive'),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  appeal_code: z.string().max(50).optional(),
  donor_email: z.string().email('Invalid donor email').optional(),
  raw_row: z.record(z.string(), z.unknown()),
});

export const importDonationsSchema = z.object({
  batch_id: z.string().uuid('Invalid batch ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  rows: z
    .array(importDonationRowSchema)
    .min(1, 'At least one row required')
    .max(5000, 'Maximum 5000 rows per import'),
});

export const listDonationsSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  appeal_id: z.string().uuid('Invalid appeal ID').optional(),
  batch_id: z.string().uuid('Invalid batch ID').optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateImportBatchInput = z.infer<typeof createImportBatchSchema>;
export type ImportDonationRow = z.infer<typeof importDonationRowSchema>;
export type ImportDonationsInput = z.infer<typeof importDonationsSchema>;
export type ListDonationsInput = z.infer<typeof listDonationsSchema>;

// M4 Reconciliation schemas

export const closePeriodSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  year: z.number().int().min(2000, 'Year must be 2000 or later').max(2100, 'Year must be 2100 or earlier'),
  month: z.number().int().min(1, 'Month must be 1–12').max(12, 'Month must be 1–12'),
});

export const getPeriodSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
export type GetPeriodInput = z.infer<typeof getPeriodSchema>;

// M5 Gift Aid schemas

export const createDeclarationSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  donor_id: z.string().uuid('Invalid donor ID'),
  declaration_type: z.enum(['enduring', 'retro', 'single']),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  signed_at: z.string().datetime('Must be ISO datetime'),
  signed_by_name: z.string().min(1, 'Signed name required').max(200),
});

export const revokeDeclarationSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  declaration_id: z.string().uuid('Invalid declaration ID'),
});

export const listDeclarationsSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  donor_id: z.string().uuid('Invalid donor ID').optional(),
});

export const createClaimSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  claim_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  claim_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
}).refine(
  (d) => d.claim_period_from <= d.claim_period_to,
  { message: 'claim_period_from must be on or before claim_period_to' }
);

export const submitClaimSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  claim_id: z.string().uuid('Invalid claim ID'),
});

export type CreateDeclarationInput = z.infer<typeof createDeclarationSchema>;
export type RevokeDeclarationInput = z.infer<typeof revokeDeclarationSchema>;
export type ListDeclarationsInput = z.infer<typeof listDeclarationsSchema>;
export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;

// Web3 schemas

export const reanchorPeriodSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  period_id: z.string().uuid('Invalid period ID'),
});

export const getAnchorSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  period_id: z.string().uuid('Invalid period ID'),
});

export type ReanchorPeriodInput = z.infer<typeof reanchorPeriodSchema>;
export type GetAnchorInput = z.infer<typeof getAnchorSchema>;
