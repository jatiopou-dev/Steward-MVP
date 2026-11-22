import { describe, it, expect } from 'vitest';
import {
  acceptMatchSchema,
  getMatchSuggestionsSchema,
  rejectMatchSchema,
  undoMatchSchema,
} from '@/lib/validation/v2';
import { dropRejected, suggestionWindow } from '@/lib/reconciliation/decisions';
import type { BankLineCandidates } from '@/lib/reconciliation/candidates';

const uuid = '12345678-1234-4234-8234-123456789abc';
const uuid2 = '12345678-1234-4234-8234-123456789abd';
const uuid3 = '12345678-1234-4234-8234-123456789abe';

describe('acceptMatchSchema', () => {
  const base = { organisation_id: uuid, donation_id: uuid2 };

  it('accepts one line, or two different lines for a split', () => {
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: [uuid3] }).success).toBe(true);
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: [uuid3, uuid], confidence: 0.87, reasons: ['split with line x'] }).success).toBe(true);
  });

  it('rejects no lines, three lines, or the same line twice', () => {
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: [] }).success).toBe(false);
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: [uuid, uuid2, uuid3] }).success).toBe(false);
    const dup = acceptMatchSchema.safeParse({ ...base, bank_line_ids: [uuid3, uuid3] });
    expect(dup.success).toBe(false);
    if (!dup.success) expect(dup.error.issues[0].message).toMatch(/different/);
  });

  it('rejects confidence outside 0–1 and invalid IDs', () => {
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: [uuid3], confidence: 1.2 }).success).toBe(false);
    expect(acceptMatchSchema.safeParse({ ...base, bank_line_ids: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('rejectMatchSchema, undoMatchSchema and getMatchSuggestionsSchema', () => {
  it('validate their inputs', () => {
    expect(rejectMatchSchema.safeParse({ organisation_id: uuid, bank_line_id: uuid2, donation_id: uuid3 }).success).toBe(true);
    expect(rejectMatchSchema.safeParse({ organisation_id: uuid, bank_line_id: uuid2 }).success).toBe(false);
    expect(undoMatchSchema.safeParse({ organisation_id: uuid, decision_id: uuid2 }).success).toBe(true);
    expect(undoMatchSchema.safeParse({ organisation_id: uuid, decision_id: 'x' }).success).toBe(false);
    expect(getMatchSuggestionsSchema.safeParse({ organisation_id: uuid, year: 2026, month: 10 }).success).toBe(true);
    expect(getMatchSuggestionsSchema.safeParse({ organisation_id: uuid, year: 2026, month: 13 }).success).toBe(false);
  });
});

describe('suggestionWindow', () => {
  it('widens the donation range by five days either side, across month and year ends', () => {
    expect(suggestionWindow(2026, 1)).toEqual({
      linesFrom: '2026-01-01',
      linesTo: '2026-01-31',
      donationsFrom: '2025-12-27',
      donationsTo: '2026-02-05',
    });
    expect(suggestionWindow(2028, 2).donationsTo).toBe('2028-03-05');
  });
});

describe('dropRejected', () => {
  const candidate = (id: string, confidence: number) => ({ donation_id: id, confidence, reasons: [], split_with: null });
  const ranked: BankLineCandidates[] = [
    { bank_line_id: 'b1', candidates: [candidate('d1', 0.9), candidate('d2', 0.8), candidate('d3', 0.7), candidate('d4', 0.6)] },
    { bank_line_id: 'b2', candidates: [candidate('d1', 0.5)] },
  ];

  it('removes rejected pairs only for their own line and refills the top three', () => {
    const out = dropRejected(ranked, [{ bank_line_id: 'b1', donation_id: 'd1' }]);
    expect(out[0].candidates.map((c) => c.donation_id)).toEqual(['d2', 'd3', 'd4']);
    expect(out[1].candidates.map((c) => c.donation_id)).toEqual(['d1']);
  });

  it('keeps the top three when nothing is rejected', () => {
    expect(dropRejected(ranked, [])[0].candidates).toHaveLength(3);
  });
});
