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
