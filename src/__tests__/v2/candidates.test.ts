import { describe, it, expect } from 'vitest';
import { rankCandidates, type RankBankLine, type RankDonation } from '@/lib/reconciliation/candidates';
import { evaluate, loadSeed } from '../../../scripts/seed-test/evaluate';

const line = (o: Partial<RankBankLine> & { id: string }): RankBankLine => ({
  transaction_date: '2026-10-01',
  amount_pence: 2000,
  reference: null,
  ...o,
});
const donation = (o: Partial<RankDonation> & { id: string; source_reference: string }): RankDonation => ({
  transaction_date: '2026-10-01',
  amount_pence: 2000,
  ...o,
});
const rankOne = (l: RankBankLine, ds: RankDonation[], lines: RankBankLine[] = [l]) =>
  rankCandidates(lines, ds).find((r) => r.bank_line_id === l.id)!.candidates;

describe('rankCandidates', () => {
  it('gives full confidence when every signal matches', () => {
    const [c] = rankOne(line({ id: 'b1', reference: 'STW-01001' }), [donation({ id: 'd1', source_reference: 'STW-01001' })]);
    expect(c).toEqual({
      donation_id: 'd1',
      confidence: 1,
      reasons: ['reference exact', 'amount exact', 'date same day'],
      split_with: null,
    });
  });

  it('ranks a misspelled reference above an unrelated one', () => {
    const cs = rankOne(line({ id: 'b1', reference: 'stw 01O01' }), [
      donation({ id: 'd2', source_reference: 'STW-01004' }),
      donation({ id: 'd1', source_reference: 'STW-01001' }),
    ]);
    expect(cs.map((c) => c.donation_id)).toEqual(['d1', 'd2']);
    expect(cs[0].reasons[0]).toBe('reference exact');
    const fuzzy = rankOne(line({ id: 'b1', reference: 'STW-0101' }), [donation({ id: 'd1', source_reference: 'STW-01001' })]);
    expect(fuzzy[0].reasons[0]).toBe('reference fuzzy');
  });

  it('keeps lines with no reference, ranking the closer date first', () => {
    const cs = rankOne(line({ id: 'b1', transaction_date: '2026-10-03' }), [
      donation({ id: 'd1', source_reference: 'STW-01001', transaction_date: '2026-09-29' }),
      donation({ id: 'd2', source_reference: 'STW-01004', transaction_date: '2026-10-02' }),
    ]);
    expect(cs.map((c) => [c.donation_id, c.reasons[0], c.reasons[2]])).toEqual([
      ['d2', 'reference missing', 'date +1d'],
      ['d1', 'reference missing', 'date +4d'],
    ]);
  });

  it('scores near amounts within 5% and drops anything further off', () => {
    const d = [donation({ id: 'd1', source_reference: 'STW-01001' })];
    const near = rankOne(line({ id: 'b1', amount_pence: 2040, reference: 'STW-01001' }), d);
    expect(near[0].reasons[1]).toBe('amount near (+2.0%)');
    expect(near[0].confidence).toBeLessThan(1);
    expect(rankOne(line({ id: 'b1', amount_pence: 2120, reference: 'STW-01001' }), d)).toEqual([]);
  });

  it('only considers donations within five days', () => {
    const d = [donation({ id: 'd1', source_reference: 'STW-01001' })];
    expect(rankOne(line({ id: 'b1', reference: 'STW-01001', transaction_date: '2026-10-06' }), d)).toHaveLength(1);
    expect(rankOne(line({ id: 'b1', reference: 'STW-01001', transaction_date: '2026-10-07' }), d)).toEqual([]);
  });

  it('matches each half of a split donation to it', () => {
    const lines = [
      line({ id: 'b1', amount_pence: 1200, reference: 'STW-01001 PT1' }),
      line({ id: 'b2', amount_pence: 800, reference: 'STW-01001 PT2', transaction_date: '2026-10-03' }),
    ];
    const ranked = rankCandidates(lines, [donation({ id: 'd1', source_reference: 'STW-01001' })]);
    expect(ranked.map((r) => [r.bank_line_id, r.candidates[0]?.split_with, r.candidates[0]?.reasons[1]])).toEqual([
      ['b1', 'b2', 'split with line b2'],
      ['b2', 'b1', 'split with line b1'],
    ]);
  });

  it('does not pair a split with a line whose reference points elsewhere, or with an inexact sum', () => {
    const d = [donation({ id: 'd1', source_reference: 'STW-01001' })];
    const b1 = line({ id: 'b1', amount_pence: 1200, reference: 'STW-01001 PT1' });
    expect(rankOne(b1, d, [b1, line({ id: 'b2', amount_pence: 800, reference: 'GROSS INTEREST' })])).toEqual([]);
    expect(rankOne(b1, d, [b1, line({ id: 'b2', amount_pence: 790 })])).toEqual([]);
  });

  it('returns at most three candidates and none for debits', () => {
    const ds = ['1', '2', '3', '4'].map((n) => donation({ id: `d${n}`, source_reference: `STW-0100${n}` }));
    expect(rankOne(line({ id: 'b1' }), ds)).toHaveLength(3);
    expect(rankOne(line({ id: 'b1', amount_pence: -2000 }), ds)).toEqual([]);
  });
});

describe('rankCandidates on the seed-test data', () => {
  it('ranks the known donation first for at least 90% of bank lines', () => {
    const e = evaluate(loadSeed());
    expect(e.total).toBe(194);
    expect(e.top1 / e.total).toBeGreaterThanOrEqual(0.9);
    expect(e.top3).toBeGreaterThanOrEqual(e.top1);
  });
});
