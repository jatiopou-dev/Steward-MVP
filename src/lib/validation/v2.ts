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
