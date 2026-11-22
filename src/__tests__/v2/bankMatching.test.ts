import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  matchBankLines,
  normalizeReference,
  referenceScore,
  nameScore,
  type MatchBankLine,
  type MatchDonation,
} from '@/lib/reconciliation/match';

const line = (o: Partial<MatchBankLine> & { id: string }): MatchBankLine => ({
  transaction_date: '2026-10-01',
  amount_pence: 2000,
  reference: null,
  counterparty_name: null,
  ...o,
});
const donation = (o: Partial<MatchDonation> & { id: string; source_reference: string }): MatchDonation => ({
  transaction_date: '2026-10-01',
  amount_pence: 2000,
  donor_name: null,
  ...o,
});

// ── reference and name scoring ────────────────────────────────────────────

describe('normalizeReference', () => {
  it('ignores case, separators and look-alike characters', () => {
    expect(normalizeReference('stw 01001')).toBe(normalizeReference('STW-O1OO1'));
  });
});

describe('referenceScore', () => {
  it('scores exact, part-suffixed, misspelled, different and missing references', () => {
    expect(referenceScore('STW-01001', 'STW-01001')).toBe(1);
    expect(referenceScore('STW-01001 PT2', 'STW-01001')).toBe(1);
    expect(referenceScore('STW-01010', 'STW-01001')).toBe(0.5);
    expect(referenceScore('STW-0101', 'STW-01001')).toBe(0.8);
    expect(referenceScore('GROSS INTEREST', 'STW-01001')).toBe(0);
    expect(referenceScore(null, 'STW-01001')).toBeNull();
  });
});

describe('nameScore', () => {
  it('finds the surname, tolerating a swapped pair of letters', () => {
    expect(nameScore('MR/MRS J THISTLEWOOD', 'Joseph Thistlewood')).toBe(1);
    expect(nameScore('J THSITLEWOOD', 'Joseph Thistlewood')).toBe(0.7);
    expect(nameScore('CASH DEPOSIT', 'Joseph Thistlewood')).toBe(0);
  });
});

// ── matchBankLines ────────────────────────────────────────────────────────

describe('matchBankLines', () => {
  it('matches on reference within the date window and not outside it', () => {
    const d = donation({ id: 'd1', source_reference: 'STW-01001' });
    const inside = matchBankLines([line({ id: 'b1', reference: 'STW-01001', transaction_date: '2026-10-06' })], [d]);
    expect(inside.matches).toMatchObject([{ donation_id: 'd1', bank_line_ids: ['b1'], match_type: 'one_to_one' }]);
    const outside = matchBankLines([line({ id: 'b1', reference: 'STW-01001', transaction_date: '2026-10-07' })], [d]);
    expect(outside.matches).toEqual([]);
  });

  it('matches a donation split across two lines', () => {
    const result = matchBankLines(
      [
        line({ id: 'b1', amount_pence: 1200, reference: 'STW-01001 PT1' }),
        line({ id: 'b2', amount_pence: 800, reference: 'STW-01001 PT2', transaction_date: '2026-10-03' }),
      ],
      [donation({ id: 'd1', source_reference: 'STW-01001' })]
    );
    expect(result.matches).toMatchObject([{ donation_id: 'd1', bank_line_ids: ['b1', 'b2'], match_type: 'split' }]);
  });

  it('never uses a line whose reference points elsewhere, and ignores debits', () => {
    const result = matchBankLines(
      [line({ id: 'b1', reference: 'GROSS INTEREST' }), line({ id: 'b2', amount_pence: -2000 })],
      [donation({ id: 'd1', source_reference: 'STW-01001' })]
    );
    expect(result.matches).toEqual([]);
    expect(result.unmatched_bank_line_ids).toEqual(['b1', 'b2']);
  });

  it('accepts amount and date alone only when the pairing is unambiguous', () => {
    const lone = matchBankLines([line({ id: 'b1' })], [donation({ id: 'd1', source_reference: 'STW-01001' })]);
    expect(lone.matches).toMatchObject([{ donation_id: 'd1', evidence: ['amount_date_only'] }]);
    const ambiguous = matchBankLines(
      [line({ id: 'b1' })],
      [donation({ id: 'd1', source_reference: 'STW-01001' }), donation({ id: 'd2', source_reference: 'STW-01004' })]
    );
    expect(ambiguous.matches).toEqual([]);
  });

  it('prefers the donor whose name is on the line', () => {
    const result = matchBankLines(
      [line({ id: 'b1', counterparty_name: 'R ROOKWOOD' })],
      [
        donation({ id: 'd1', source_reference: 'STW-01001', donor_name: 'Ben Hollins' }),
        donation({ id: 'd2', source_reference: 'STW-01004', donor_name: 'Ruth Rookwood' }),
      ]
    );
    expect(result.matches).toMatchObject([{ donation_id: 'd2', evidence: ['donor_name'] }]);
  });
});

// ── against the seed-test answer key ──────────────────────────────────────

function readCsv(path: string): Record<string, string>[] {
  const rows = readFileSync(path, 'utf8').trimEnd().split('\n').map((r) => {
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (quoted && ch === '"' && r[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return cells;
  });
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
}

describe('matchBankLines on the seed-test data', () => {
  let bankLines: MatchBankLine[];
  let donations: MatchDonation[];
  let expected: Map<string, string[]>;

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'seed-test-'));
    try {
      execFileSync(process.execPath, [resolve('scripts/seed-test/generate.mjs'), `--out=${dir}`], { stdio: 'pipe' });
      bankLines = readCsv(join(dir, 'bank_lines.csv')).map((r) => ({
        id: r.bank_line_id,
        transaction_date: r.date,
        amount_pence: Math.round(Number(r.amount) * 100),
        reference: r.reference || null,
        counterparty_name: r.counterparty || null,
      }));
      donations = readCsv(join(dir, 'donations.csv')).map((r) => ({
        id: r.donation_id,
        transaction_date: r.date,
        amount_pence: Number(r.amount_pence),
        source_reference: r.reference,
        donor_name: r.donor_name || null,
      }));
      expected = new Map();
      for (const r of readCsv(join(dir, 'expected_matches.csv'))) {
        expected.set(r.donation_id, [...(expected.get(r.donation_id) ?? []), r.bank_line_id]);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reproduces the answer key', () => {
    const result = matchBankLines(bankLines, donations);
    const key = (ids: string[]) => [...ids].sort().join();
    const wrong = result.matches.filter((m) => key(m.bank_line_ids) !== key(expected.get(m.donation_id) ?? []));
    const found = result.matches.length - wrong.length;
    expect({ wrong: wrong.length, found }).toEqual({ wrong: 0, found: expected.size });
    expect(result.unmatched_donation_ids).toHaveLength(donations.length - expected.size);
  });
});
