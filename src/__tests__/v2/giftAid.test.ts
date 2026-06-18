import { describe, it, expect } from 'vitest';
import {
  createDeclarationSchema,
  revokeDeclarationSchema,
  createClaimSchema,
  submitClaimSchema,
  listDeclarationsSchema,
} from '@/lib/validation/v2';
import { buildCharitiesOnlineCsv, type CsvDonationRow } from '@/lib/giftAid/csv';
import { isDeclarationActive } from '@/lib/giftAid/declarations';

const uuid = '12345678-1234-4234-8234-123456789abc';

// ── createDeclarationSchema ───────────────────────────────────────────────

describe('createDeclarationSchema', () => {
  it('accepts valid enduring declaration', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'enduring',
      effective_from: '2024-01-01',
      signed_at: '2024-01-01T10:00:00Z',
      signed_by_name: 'John Smith',
    });
    expect(result.success).toBe(true);
  });

  it('accepts retro declaration with effective_to', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'retro',
      effective_from: '2020-01-01',
      effective_to: '2024-12-31',
      signed_at: '2024-01-01T10:00:00Z',
      signed_by_name: 'Jane Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing signed_by_name', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'enduring',
      effective_from: '2024-01-01',
      signed_at: '2024-01-01T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format for effective_from', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'enduring',
      effective_from: '01/01/2024',
      signed_at: '2024-01-01T10:00:00Z',
      signed_by_name: 'John Smith',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/YYYY-MM-DD/);
    }
  });

  it('rejects invalid declaration_type', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'annual',
      effective_from: '2024-01-01',
      signed_at: '2024-01-01T10:00:00Z',
      signed_by_name: 'John Smith',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty signed_by_name', () => {
    const result = createDeclarationSchema.safeParse({
      organisation_id: uuid,
      donor_id: uuid,
      declaration_type: 'enduring',
      effective_from: '2024-01-01',
      signed_at: '2024-01-01T10:00:00Z',
      signed_by_name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Signed name required/);
    }
  });
});

// ── createClaimSchema ─────────────────────────────────────────────────────

describe('createClaimSchema', () => {
  it('accepts valid date range', () => {
    const result = createClaimSchema.safeParse({
      organisation_id: uuid,
      claim_period_from: '2024-01-01',
      claim_period_to: '2024-03-31',
    });
    expect(result.success).toBe(true);
  });

  it('accepts same-day range', () => {
    const result = createClaimSchema.safeParse({
      organisation_id: uuid,
      claim_period_from: '2024-06-15',
      claim_period_to: '2024-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects from > to', () => {
    const result = createClaimSchema.safeParse({
      organisation_id: uuid,
      claim_period_from: '2024-03-31',
      claim_period_to: '2024-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/on or before/);
    }
  });

  it('rejects invalid date format', () => {
    const result = createClaimSchema.safeParse({
      organisation_id: uuid,
      claim_period_from: '2024/01/01',
      claim_period_to: '2024-03-31',
    });
    expect(result.success).toBe(false);
  });
});

// ── revokeDeclarationSchema ───────────────────────────────────────────────

describe('revokeDeclarationSchema', () => {
  it('accepts valid input', () => {
    const result = revokeDeclarationSchema.safeParse({
      organisation_id: uuid,
      declaration_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid declaration_id', () => {
    const result = revokeDeclarationSchema.safeParse({
      organisation_id: uuid,
      declaration_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ── submitClaimSchema ─────────────────────────────────────────────────────

describe('submitClaimSchema', () => {
  it('accepts valid input', () => {
    const result = submitClaimSchema.safeParse({
      organisation_id: uuid,
      claim_id: uuid,
    });
    expect(result.success).toBe(true);
  });
});

// ── isDeclarationActive ───────────────────────────────────────────────────

describe('isDeclarationActive', () => {
  const baseDecl = {
    effective_from: '2020-01-01',
    effective_to: null,
    revoked_at: null,
  };

  it('returns true for enduring declaration with no end date', () => {
    expect(isDeclarationActive(baseDecl, '2024-06-15')).toBe(true);
  });

  it('returns false for revoked declaration', () => {
    expect(isDeclarationActive({ ...baseDecl, revoked_at: '2023-01-01T00:00:00Z' }, '2024-06-15')).toBe(false);
  });

  it('returns false when transaction_date is before effective_from', () => {
    expect(isDeclarationActive({ ...baseDecl, effective_from: '2024-01-01' }, '2023-12-31')).toBe(false);
  });

  it('returns true when transaction_date equals effective_from', () => {
    expect(isDeclarationActive({ ...baseDecl, effective_from: '2024-01-01' }, '2024-01-01')).toBe(true);
  });

  it('returns false when transaction_date is after effective_to', () => {
    expect(isDeclarationActive({ ...baseDecl, effective_to: '2024-03-31' }, '2024-04-01')).toBe(false);
  });

  it('returns true when transaction_date equals effective_to', () => {
    expect(isDeclarationActive({ ...baseDecl, effective_to: '2024-03-31' }, '2024-03-31')).toBe(true);
  });

  it('returns true for retro declaration covering the date', () => {
    expect(isDeclarationActive(
      { effective_from: '2020-01-01', effective_to: '2024-12-31', revoked_at: null },
      '2022-06-15'
    )).toBe(true);
  });
});

// ── buildCharitiesOnlineCsv ───────────────────────────────────────────────

describe('buildCharitiesOnlineCsv', () => {
  it('returns header only for empty rows', () => {
    const csv = buildCharitiesOnlineCsv([]);
    expect(csv).toBe(
      'Donor title,Donor first name,Donor last name,House name or number,Postcode,Donation date,Donation amount'
    );
  });

  it('produces correct row for single donation', () => {
    const rows: CsvDonationRow[] = [{
      donor_display_name: 'John Smith',
      transaction_date: '2024-01-15',
      amount_pence: 5000,
    }];
    const csv = buildCharitiesOnlineCsv(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(',John,Smith,,,2024-01-15,50.00');
  });

  it('splits multi-word last name correctly', () => {
    const rows: CsvDonationRow[] = [{
      donor_display_name: 'Mary Jane Watson',
      transaction_date: '2024-02-01',
      amount_pence: 1000,
    }];
    const csv = buildCharitiesOnlineCsv(rows);
    expect(csv).toContain(',Mary,Jane Watson,');
  });

  it('handles single-word name', () => {
    const rows: CsvDonationRow[] = [{
      donor_display_name: 'Madonna',
      transaction_date: '2024-03-01',
      amount_pence: 2500,
    }];
    const csv = buildCharitiesOnlineCsv(rows);
    expect(csv).toContain(',Madonna,,');
  });

  it('formats 5000 pence as 50.00', () => {
    const rows: CsvDonationRow[] = [{
      donor_display_name: 'Test Donor',
      transaction_date: '2024-01-01',
      amount_pence: 5000,
    }];
    const csv = buildCharitiesOnlineCsv(rows);
    expect(csv).toContain('50.00');
  });

  it('formats 101 pence as 1.01', () => {
    const rows: CsvDonationRow[] = [{
      donor_display_name: 'Test Donor',
      transaction_date: '2024-01-01',
      amount_pence: 101,
    }];
    const csv = buildCharitiesOnlineCsv(rows);
    expect(csv).toContain('1.01');
  });

  it('produces correct number of rows for multiple donations', () => {
    const rows: CsvDonationRow[] = [
      { donor_display_name: 'Alice Brown', transaction_date: '2024-01-01', amount_pence: 1000 },
      { donor_display_name: 'Bob Green', transaction_date: '2024-01-15', amount_pence: 2000 },
      { donor_display_name: 'Carol White', transaction_date: '2024-02-01', amount_pence: 3000 },
    ];
    const csv = buildCharitiesOnlineCsv(rows);
    expect(csv.split('\n')).toHaveLength(4);
  });
});
