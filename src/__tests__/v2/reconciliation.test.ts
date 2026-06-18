import { describe, it, expect } from 'vitest';
import { closePeriodSchema, getPeriodSchema } from '@/lib/validation/v2';

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

// ── lastDayOfMonth logic ──────────────────────────────────────────────────

describe('lastDayOfMonth boundary dates', () => {
  function lastDayOfMonth(year: number, month: number): string {
    const d = new Date(Date.UTC(year, month, 0));
    return d.toISOString().split('T')[0];
  }

  it('returns Jan 31 for January', () => {
    expect(lastDayOfMonth(2024, 1)).toBe('2024-01-31');
  });

  it('returns Feb 29 for Feb in leap year 2024', () => {
    expect(lastDayOfMonth(2024, 2)).toBe('2024-02-29');
  });

  it('returns Feb 28 for Feb in non-leap year 2023', () => {
    expect(lastDayOfMonth(2023, 2)).toBe('2023-02-28');
  });

  it('returns Dec 31 for December', () => {
    expect(lastDayOfMonth(2024, 12)).toBe('2024-12-31');
  });

  it('returns Apr 30 for April', () => {
    expect(lastDayOfMonth(2024, 4)).toBe('2024-04-30');
  });
});
