import { describe, it, expect } from 'vitest';
import { closePeriodSchema, getPeriodSchema } from '@/lib/validation/v2';
import { lastDayOfMonth } from '@/lib/utils/date';
import {
  periodLabel,
  periodRange,
  parsePeriod,
  summarisePeriod,
  type PeriodDonation,
  type PeriodAppeal,
} from '@/lib/reconciliation/period';

const uuid = '12345678-1234-4234-8234-123456789abc';

// ── closePeriodSchema ─────────────────────────────────────────────────────

describe('closePeriodSchema', () => {
  it('accepts valid input', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects month 0', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Month must be 1/);
    }
  });

  it('rejects month 13', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 13,
    });
    expect(result.success).toBe(false);
  });

  it('rejects year below 2000', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 1999,
      month: 6,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/2000/);
    }
  });

  it('rejects year above 2100', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2101,
      month: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing organisation_id', () => {
    const result = closePeriodSchema.safeParse({ year: 2024, month: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer year', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024.5,
      month: 6,
    });
    expect(result.success).toBe(false);
  });

  it('accepts December (month 12)', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 12,
    });
    expect(result.success).toBe(true);
  });
});

// ── getPeriodSchema ───────────────────────────────────────────────────────

describe('getPeriodSchema', () => {
  it('accepts valid input', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing month', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: 'not-a-uuid',
      year: 2024,
      month: 3,
    });
    expect(result.success).toBe(false);
  });
});

// ── lastDayOfMonth (the real implementation) ──────────────────────────────

describe('lastDayOfMonth', () => {
  it('returns Jan 31 for January', () => {
    expect(lastDayOfMonth(2024, 1)).toBe('2024-01-31');
  });

  it('returns Feb 29 in a leap year', () => {
    expect(lastDayOfMonth(2024, 2)).toBe('2024-02-29');
  });

  it('returns Feb 28 in a non-leap year', () => {
    expect(lastDayOfMonth(2023, 2)).toBe('2023-02-28');
  });

  it('returns Feb 29 in 2000, a century leap year', () => {
    expect(lastDayOfMonth(2000, 2)).toBe('2000-02-29');
  });

  it('returns Feb 28 in 2100, a century non-leap year', () => {
    expect(lastDayOfMonth(2100, 2)).toBe('2100-02-28');
  });

  it('returns Apr 30 for a 30-day month', () => {
    expect(lastDayOfMonth(2024, 4)).toBe('2024-04-30');
  });

  it('returns Dec 31 for December', () => {
    expect(lastDayOfMonth(2024, 12)).toBe('2024-12-31');
  });
});

// ── periodLabel ───────────────────────────────────────────────────────────

describe('periodLabel', () => {
  it('zero-pads a single-digit month', () => {
    expect(periodLabel(2024, 1)).toBe('2024-01');
  });

  it('leaves a two-digit month alone', () => {
    expect(periodLabel(2024, 12)).toBe('2024-12');
  });
});

// ── periodRange ───────────────────────────────────────────────────────────

describe('periodRange', () => {
  it('spans the whole of January', () => {
    expect(periodRange(2024, 1)).toEqual({ from: '2024-01-01', to: '2024-01-31' });
  });

  it('ends on the 29th in a leap February', () => {
    expect(periodRange(2024, 2)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('ends on the 28th in a non-leap February', () => {
    expect(periodRange(2023, 2)).toEqual({ from: '2023-02-01', to: '2023-02-28' });
  });

  it('spans a 30-day month', () => {
    expect(periodRange(2024, 4)).toEqual({ from: '2024-04-01', to: '2024-04-30' });
  });

  it('does not spill into the next year in December', () => {
    expect(periodRange(2024, 12)).toEqual({ from: '2024-12-01', to: '2024-12-31' });
  });

  it('produces a range whose bounds are ordered', () => {
    for (let m = 1; m <= 12; m++) {
      const { from, to } = periodRange(2024, m);
      expect(from <= to).toBe(true);
    }
  });
});

// ── parsePeriod ───────────────────────────────────────────────────────────

describe('parsePeriod', () => {
  it('reads a valid date', () => {
    expect(parsePeriod('2024-06-15')).toEqual({ year: 2024, month: 6 });
  });

  it('reads a boundary date', () => {
    expect(parsePeriod('2024-12-31')).toEqual({ year: 2024, month: 12 });
  });

  it('rejects a malformed date', () => {
    expect(parsePeriod('not-a-date')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(parsePeriod('')).toBeNull();
  });

  it('rejects month 0', () => {
    expect(parsePeriod('2024-00-10')).toBeNull();
  });

  it('rejects month 13', () => {
    expect(parsePeriod('2024-13-10')).toBeNull();
  });
});

// ── summarisePeriod ───────────────────────────────────────────────────────

describe('summarisePeriod', () => {
  const appealA: PeriodAppeal = { id: 'a1', code: 'ROOF', name: 'Roof fund' };
  const appealB: PeriodAppeal = { id: 'a2', code: 'MISS', name: 'Mission' };
  const gift = (id: string, amount_pence: number, appeal_id: string | null = null): PeriodDonation =>
    ({ id, amount_pence, appeal_id });

  it('returns zeroes for no donations', () => {
    expect(summarisePeriod({ donations: [], appeals: [] })).toEqual({
      donation_count: 0,
      total_pence: 0,
      summary_by_appeal: [],
    });
  });

  it('counts and totals donations', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000), gift('d2', 2500)],
      appeals: [],
    });
    expect(s.donation_count).toBe(2);
    expect(s.total_pence).toBe(7500);
  });

  it('groups donations by appeal', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1'), gift('d2', 2500, 'a1'), gift('d3', 1000, 'a2')],
      appeals: [appealA, appealB],
    });
    expect(s.summary_by_appeal).toEqual([
      { appeal_id: 'a1', appeal_code: 'ROOF', appeal_name: 'Roof fund', count: 2, total_pence: 7500 },
      { appeal_id: 'a2', appeal_code: 'MISS', appeal_name: 'Mission', count: 1, total_pence: 1000 },
    ]);
  });

  it('counts unassigned donations in the total but in no appeal line', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1'), gift('d2', 2500)],
      appeals: [appealA],
    });
    expect(s.donation_count).toBe(2);
    expect(s.total_pence).toBe(7500);
    expect(s.summary_by_appeal).toHaveLength(1);
    expect(s.summary_by_appeal[0].total_pence).toBe(5000);
  });

  it('omits an appeal with no donations in the period', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1')],
      appeals: [appealA, appealB],
    });
    expect(s.summary_by_appeal.map((a) => a.appeal_id)).toEqual(['a1']);
  });

  it('omits an appeal that could not be looked up, keeping the total intact', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1'), gift('d2', 3000, 'missing')],
      appeals: [appealA],
    });
    expect(s.total_pence).toBe(8000);
    expect(s.summary_by_appeal).toHaveLength(1);
    const appealSum = s.summary_by_appeal.reduce((n, a) => n + a.total_pence, 0);
    expect(appealSum).toBe(5000);
  });

  it('handles a refund reducing an appeal total', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1'), gift('d2', -1000, 'a1')],
      appeals: [appealA],
    });
    expect(s.summary_by_appeal[0].total_pence).toBe(4000);
    expect(s.summary_by_appeal[0].count).toBe(2);
    expect(s.total_pence).toBe(4000);
  });

  it('keeps appeal totals summing to the overall total when all are assigned', () => {
    const s = summarisePeriod({
      donations: [gift('d1', 5000, 'a1'), gift('d2', 1000, 'a2'), gift('d3', 250, 'a2')],
      appeals: [appealA, appealB],
    });
    const appealSum = s.summary_by_appeal.reduce((n, a) => n + a.total_pence, 0);
    expect(appealSum).toBe(s.total_pence);
  });
});
