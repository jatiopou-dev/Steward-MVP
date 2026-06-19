import { describe, it, expect } from 'vitest';
import { reanchorPeriodSchema, getAnchorSchema } from '@/lib/validation/v2';
import { mapTheGivingBlockRow } from '@/lib/importMaps/theGivingBlock';
import { buildAnchorPayload, hashAnchorPayload } from '@/lib/blockchain/anchor';
import type { AnchorPayload } from '@/lib/types/v2';

const uuid = '12345678-1234-4234-8234-123456789abc';
const uuid2 = '87654321-4321-4321-8321-cba987654321';

// ── reanchorPeriodSchema ──────────────────────────────────────────────────

describe('reanchorPeriodSchema', () => {
  it('accepts valid input', () => {
    const result = reanchorPeriodSchema.safeParse({
      organisation_id: uuid,
      period_id: uuid2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid period_id', () => {
    const result = reanchorPeriodSchema.safeParse({
      organisation_id: uuid,
      period_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing organisation_id', () => {
    const result = reanchorPeriodSchema.safeParse({
      period_id: uuid,
    });
    expect(result.success).toBe(false);
  });
});

// ── getAnchorSchema ───────────────────────────────────────────────────────

describe('getAnchorSchema', () => {
  it('accepts valid input', () => {
    const result = getAnchorSchema.safeParse({
      organisation_id: uuid,
      period_id: uuid2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid', () => {
    const result = getAnchorSchema.safeParse({
      organisation_id: 'bad',
      period_id: uuid,
    });
    expect(result.success).toBe(false);
  });
});

// ── mapTheGivingBlockRow ──────────────────────────────────────────────────

describe('mapTheGivingBlockRow', () => {
  const validRow = {
    'Settlement Date': '2024-03-15',
    'Settlement Amount (GBP)': '50.00',
    'Transaction ID': 'TGB-12345',
    'Donor Name': 'John Smith',
    'Cryptocurrency': 'ETH',
    'Crypto Amount': '0.025',
    'Exchange Rate': '2000.00',
  };

  it('maps valid row correctly', () => {
    const result = mapTheGivingBlockRow(validRow);
    expect(result).not.toBeNull();
    expect(result!.source_reference).toBe('TGB-12345');
    expect(result!.amount_pence).toBe(5000);
    expect(result!.transaction_date).toBe('2024-03-15');
  });

  it('converts amount to pence (× 100)', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Amount (GBP)': '1.01' });
    expect(result!.amount_pence).toBe(101);
  });

  it('rounds pence correctly', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Amount (GBP)': '10.005' });
    expect(result!.amount_pence).toBe(1001);
  });

  it('preserves raw_row', () => {
    const result = mapTheGivingBlockRow(validRow);
    expect(result!.raw_row).toEqual(validRow);
  });

  it('includes donor name in description', () => {
    const result = mapTheGivingBlockRow(validRow);
    expect(result!.description).toContain('John Smith');
  });

  it('returns null for missing transaction ID', () => {
    const row = { ...validRow };
    delete (row as Record<string, string>)['Transaction ID'];
    expect(mapTheGivingBlockRow(row)).toBeNull();
  });

  it('returns null for zero amount', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Amount (GBP)': '0.00' });
    expect(result).toBeNull();
  });

  it('returns null for missing date', () => {
    const row = { ...validRow };
    delete (row as Record<string, string>)['Settlement Date'];
    expect(mapTheGivingBlockRow(row)).toBeNull();
  });

  it('handles DD/MM/YYYY date format', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Date': '15/03/2024' });
    expect(result!.transaction_date).toBe('2024-03-15');
  });

  it('handles amount with £ symbol', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Amount (GBP)': '£50.00' });
    expect(result!.amount_pence).toBe(5000);
  });

  it('handles amount with comma separator', () => {
    const result = mapTheGivingBlockRow({ ...validRow, 'Settlement Amount (GBP)': '1,000.00' });
    expect(result!.amount_pence).toBe(100000);
  });
});

// ── buildAnchorPayload ────────────────────────────────────────────────────

describe('buildAnchorPayload', () => {
  const baseParams = {
    organisation_id: uuid,
    period_id: uuid2,
    year: 2024,
    month: 6,
    total_pence: 125000,
    donation_count: 3,
    donation_ids: ['ccc', 'aaa', 'bbb'],
    audit_log_ids: ['zzz', 'aaa'],
    closed_by: uuid,
    closed_at: '2024-07-01T10:00:00Z',
    prev_anchor_tx_hash: null,
  };

  it('returns correct steward_version', () => {
    const payload = buildAnchorPayload(baseParams);
    expect(payload.steward_version).toBe('1');
  });

  it('sorts donation_ids ascending', () => {
    const payload = buildAnchorPayload(baseParams);
    expect(payload.donation_ids).toEqual(['aaa', 'bbb', 'ccc']);
  });

  it('sorts audit_log_ids ascending', () => {
    const payload = buildAnchorPayload(baseParams);
    expect(payload.audit_log_ids).toEqual(['aaa', 'zzz']);
  });

  it('does not mutate input arrays', () => {
    const ids = ['ccc', 'aaa', 'bbb'];
    buildAnchorPayload({ ...baseParams, donation_ids: ids });
    expect(ids).toEqual(['ccc', 'aaa', 'bbb']);
  });

  it('is deterministic — same input produces same output', () => {
    const p1 = buildAnchorPayload(baseParams);
    const p2 = buildAnchorPayload(baseParams);
    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
  });

  it('preserves all fields', () => {
    const payload = buildAnchorPayload(baseParams);
    expect(payload.organisation_id).toBe(uuid);
    expect(payload.year).toBe(2024);
    expect(payload.month).toBe(6);
    expect(payload.total_pence).toBe(125000);
    expect(payload.donation_count).toBe(3);
    expect(payload.prev_anchor_tx_hash).toBeNull();
  });
});

// ── hashAnchorPayload ─────────────────────────────────────────────────────

describe('hashAnchorPayload', () => {
  const payload: AnchorPayload = {
    steward_version: '1',
    organisation_id: uuid,
    period_id: uuid2,
    year: 2024,
    month: 6,
    total_pence: 125000,
    donation_count: 3,
    donation_ids: ['aaa', 'bbb', 'ccc'],
    audit_log_ids: ['aaa', 'zzz'],
    closed_by: uuid,
    closed_at: '2024-07-01T10:00:00Z',
    prev_anchor_tx_hash: null,
  };

  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashAnchorPayload(payload);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same payload produces same hash', () => {
    expect(hashAnchorPayload(payload)).toBe(hashAnchorPayload(payload));
  });

  it('different payload produces different hash', () => {
    const modified = { ...payload, total_pence: 999999 };
    expect(hashAnchorPayload(payload)).not.toBe(hashAnchorPayload(modified));
  });

  it('hash changes if donation_ids order changes', () => {
    const p1 = { ...payload, donation_ids: ['aaa', 'bbb'] };
    const p2 = { ...payload, donation_ids: ['bbb', 'aaa'] };
    expect(hashAnchorPayload(p1)).not.toBe(hashAnchorPayload(p2));
  });
});
