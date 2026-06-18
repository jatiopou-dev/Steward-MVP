import { describe, it, expect } from 'vitest';
import { inviteMemberSchema, updateMemberRoleSchema, removeMemberSchema } from '@/lib/validation/v2';

describe('inviteMemberSchema', () => {
  it('accepts valid invite', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'treasurer@church.org',
      role: 'finance_manager',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
  });

  it('rejects owner role (owner is set only at org creation)', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@test.com',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMemberRoleSchema', () => {
  it('accepts valid role change', () => {
    const result = updateMemberRoleSchema.safeParse({
      membership_id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
      role: 'viewer',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid membership_id', () => {
    const result = updateMemberRoleSchema.safeParse({
      membership_id: 'bad-id',
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('accepts valid remove input', () => {
    const result = removeMemberSchema.safeParse({
      membership_id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });
});
