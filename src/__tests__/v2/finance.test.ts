import { describe, it, expect } from 'vitest';
import {
  createAppealSchema,
  updateAppealSchema,
  createDonorSchema,
  updateDonorSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
} from '@/lib/validation/v2';

const uuid = '12345678-1234-4234-8234-123456789abc';

describe('createAppealSchema', () => {
  it('accepts valid input', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: uuid,
      code: 'FUND2024',
      name: 'General Fund 2024',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing organisation_id', () => {
    const result = createAppealSchema.safeParse({
      code: 'FUND',
      name: 'Fund',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty code', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: uuid,
      code: '',
      name: 'Fund',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Code required/);
    }
  });

  it('rejects code longer than 50 characters', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: uuid,
      code: 'A'.repeat(51),
      name: 'Fund',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: uuid,
      code: 'CODE',
      name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Name required/);
    }
  });
});

describe('updateAppealSchema', () => {
  it('accepts valid input with optional name', () => {
    const result = updateAppealSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without optional name', () => {
    const result = updateAppealSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = updateAppealSchema.safeParse({
      organisation_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid id uuid', () => {
    const result = updateAppealSchema.safeParse({
      id: 'not-a-uuid',
      organisation_id: uuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Invalid appeal ID/);
    }
  });
});

describe('createDonorSchema', () => {
  it('accepts valid input', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: uuid,
      display_name: 'John Smith',
      email: 'john@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without optional email', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: uuid,
      display_name: 'Jane Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty display_name', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: uuid,
      display_name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Name required/);
    }
  });

  it('rejects invalid email when provided', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: uuid,
      display_name: 'John',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Invalid email/);
    }
  });
});

describe('updateDonorSchema', () => {
  it('accepts valid input', () => {
    const result = updateDonorSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
      display_name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = updateDonorSchema.safeParse({
      organisation_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid organisation_id uuid', () => {
    const result = updateDonorSchema.safeParse({
      id: uuid,
      organisation_id: 'bad-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Invalid organisation ID/);
    }
  });
});

describe('createBankAccountSchema', () => {
  it('accepts valid input', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: uuid,
      name: 'Main Account',
      account_last4: '1234',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without optional account_last4', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: uuid,
      name: 'Main Account',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: uuid,
      name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Name required/);
    }
  });

  it('rejects account_last4 with non-digits', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: uuid,
      name: 'Account',
      account_last4: 'ABCD',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/4 digits/);
    }
  });

  it('rejects account_last4 not exactly 4 chars', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: uuid,
      name: 'Account',
      account_last4: '12',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateBankAccountSchema', () => {
  it('accepts valid input with status', () => {
    const result = updateBankAccountSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
      status: 'archived',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without optional fields', () => {
    const result = updateBankAccountSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = updateBankAccountSchema.safeParse({
      id: uuid,
      organisation_id: uuid,
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = updateBankAccountSchema.safeParse({
      organisation_id: uuid,
    });
    expect(result.success).toBe(false);
  });
});
