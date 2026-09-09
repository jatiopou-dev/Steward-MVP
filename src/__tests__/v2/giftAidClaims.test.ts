import { describe, it, expect } from 'vitest';
import {
  buildClaim,
  giftAidPence,
  GIFT_AID_RATE_PERCENT,
  type ClaimableDonation,
  type ClaimableDeclaration,
} from '@/lib/giftAid/claims';

const DONOR_A = 'donor-a';
const DONOR_B = 'donor-b';

const enduring = (donor_id: string, id = `decl-${donor_id}`): ClaimableDeclaration => ({
  id,
  donor_id,
  effective_from: '2020-01-01',
  effective_to: null,
  revoked_at: null,
});

const donation = (
  id: string,
  donor_id: string,
  amount_pence: number,
  transaction_date = '2024-06-15'
): ClaimableDonation => ({ id, donor_id, amount_pence, transaction_date });

const build = (o: Partial<Parameters<typeof buildClaim>[0]> = {}) =>
  buildClaim({
    donations: [],
    declarations: [],
    eligibleDonorIds: new Set(),
    alreadyClaimedDonationIds: new Set(),
    ...o,
  });

// ── giftAidPence: the money math ──────────────────────────────────────────

describe('giftAidPence', () => {
  it('reclaims 25% — £1.00 donation yields 25p', () => {
    expect(giftAidPence(100)).toBe(25);
  });

  it('uses the documented HMRC basic rate', () => {
    expect(GIFT_AID_RATE_PERCENT).toBe(25);
  });

  it('handles a typical £50 donation', () => {
    expect(giftAidPence(5000)).toBe(1250);
  });

  it('returns 0 for a 0p donation', () => {
    expect(giftAidPence(0)).toBe(0);
  });

  it('rounds a half-penny result up (3p -> 0.75p -> 1p)', () => {
    expect(giftAidPence(3)).toBe(1);
  });

  it('rounds down below the half penny (1p -> 0.25p -> 0p)', () => {
    expect(giftAidPence(1)).toBe(0);
  });

  it('rounds 2p (0.5p) up to 1p — half-up, not banker’s rounding', () => {
    expect(giftAidPence(2)).toBe(1);
  });

  it('never returns a fractional penny', () => {
    for (let pence = 0; pence <= 500; pence++) {
      expect(Number.isInteger(giftAidPence(pence))).toBe(true);
    }
  });

  it('stays exact on a large donation (£1,000,000)', () => {
    expect(giftAidPence(100_000_000)).toBe(25_000_000);
  });
});

// ── eligibility rules ─────────────────────────────────────────────────────

describe('buildClaim eligibility', () => {
  it('returns an empty claim when there are no donations', () => {
    expect(build()).toEqual({
      claimRows: [],
      total_donations_pence: 0,
      total_gift_aid_pence: 0,
    });
  });

  it('includes a donation from an eligible donor with an active declaration', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows).toEqual([
      { donation_id: 'd1', declaration_id: `decl-${DONOR_A}`, gift_aid_pence: 1250 },
    ]);
    expect(result.total_donations_pence).toBe(5000);
    expect(result.total_gift_aid_pence).toBe(1250);
  });

  it('excludes a donor not flagged gift_aid_eligible', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set(),
    });
    expect(result.claimRows).toEqual([]);
    expect(result.total_gift_aid_pence).toBe(0);
  });

  it('excludes an eligible donor with no declaration at all', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows).toEqual([]);
  });

  it('does not borrow another donor’s declaration', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [enduring(DONOR_B)],
      eligibleDonorIds: new Set([DONOR_A, DONOR_B]),
    });
    expect(result.claimRows).toEqual([]);
  });

  it('excludes a donation predating the declaration', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000, '2019-12-31')],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows).toEqual([]);
  });

  it('excludes a donation under a revoked declaration', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [{ ...enduring(DONOR_A), revoked_at: '2023-01-01T00:00:00Z' }],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows).toEqual([]);
  });

  it('excludes a donation after a declaration has lapsed', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000, '2024-06-15')],
      declarations: [{ ...enduring(DONOR_A), effective_to: '2024-03-31' }],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows).toEqual([]);
  });

  it('picks the covering declaration when a donor has several', () => {
    const lapsed: ClaimableDeclaration = {
      id: 'decl-old',
      donor_id: DONOR_A,
      effective_from: '2018-01-01',
      effective_to: '2019-12-31',
      revoked_at: null,
    };
    const result = build({
      donations: [donation('d1', DONOR_A, 5000, '2024-06-15')],
      declarations: [lapsed, enduring(DONOR_A, 'decl-current')],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.claimRows[0].declaration_id).toBe('decl-current');
  });
});

// ── double-claim protection ───────────────────────────────────────────────

describe('buildClaim double-claim protection', () => {
  it('excludes a donation already attached to a claim', () => {
    const result = build({
      donations: [donation('d1', DONOR_A, 5000)],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
      alreadyClaimedDonationIds: new Set(['d1']),
    });
    expect(result.claimRows).toEqual([]);
    expect(result.total_gift_aid_pence).toBe(0);
  });

  it('claims only the unclaimed donations in a mixed batch', () => {
    const result = build({
      donations: [
        donation('d1', DONOR_A, 5000),
        donation('d2', DONOR_A, 2000),
        donation('d3', DONOR_A, 1000),
      ],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
      alreadyClaimedDonationIds: new Set(['d2']),
    });
    expect(result.claimRows.map((r) => r.donation_id)).toEqual(['d1', 'd3']);
    expect(result.total_donations_pence).toBe(6000);
    expect(result.total_gift_aid_pence).toBe(1500);
  });
});

// ── totals ────────────────────────────────────────────────────────────────

describe('buildClaim totals', () => {
  it('sums per-donation rounding rather than rounding the total', () => {
    // Three 3p donations: each rounds 0.75p -> 1p, so 3p total.
    // Rounding the sum instead would give round(9 * 0.25) = 2p.
    const result = build({
      donations: [
        donation('d1', DONOR_A, 3),
        donation('d2', DONOR_A, 3),
        donation('d3', DONOR_A, 3),
      ],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.total_donations_pence).toBe(9);
    expect(result.total_gift_aid_pence).toBe(3);
  });

  it('totals match the sum of the emitted rows', () => {
    const result = build({
      donations: [
        donation('d1', DONOR_A, 1234),
        donation('d2', DONOR_B, 5678),
        donation('d3', DONOR_A, 9),
      ],
      declarations: [enduring(DONOR_A), enduring(DONOR_B)],
      eligibleDonorIds: new Set([DONOR_A, DONOR_B]),
    });
    const rowSum = result.claimRows.reduce((n, r) => n + r.gift_aid_pence, 0);
    expect(result.total_gift_aid_pence).toBe(rowSum);
    expect(result.claimRows).toHaveLength(3);
  });

  it('counts only claimable donations toward total_donations_pence', () => {
    const result = build({
      donations: [
        donation('d1', DONOR_A, 5000),
        donation('d2', DONOR_B, 9999), // donor not eligible
      ],
      declarations: [enduring(DONOR_A)],
      eligibleDonorIds: new Set([DONOR_A]),
    });
    expect(result.total_donations_pence).toBe(5000);
  });
});
