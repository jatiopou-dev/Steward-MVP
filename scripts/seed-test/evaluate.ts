/**
 * Scores `rankCandidates` against the seed-test answer key.
 * Run with `npm run eval:matching` (see scripts/seed-test/README.md).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  rankCandidates,
  type BankLineCandidates,
  type RankBankLine,
  type RankDonation,
} from '../../src/lib/reconciliation/candidates';

export interface SeedData {
  bankLines: RankBankLine[];
  donations: RankDonation[];
  /** bank line id -> the donation it pays. */
  expected: Map<string, string>;
  /** Bank lines that must not match (fees, interest, transfers, near misses). */
  decoys: Set<string>;
}

export interface Miss {
  bank_line_id: string;
  bank_reference: string | null;
  expected_donation_id: string;
  expected_rank: number | null;
  top: BankLineCandidates['candidates'];
}

export interface Evaluation {
  total: number;
  top1: number;
  top3: number;
  misses: Miss[];
  decoysWithCandidates: BankLineCandidates[];
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = text.trimEnd().split('\n').map((r) => {
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

/** Generates the seed into a temporary directory and loads it. */
export function loadSeed(seed?: number): SeedData {
  const dir = mkdtempSync(join(tmpdir(), 'seed-eval-'));
  try {
    const args = [resolve('scripts/seed-test/generate.mjs'), `--out=${dir}`];
    if (seed !== undefined) args.push(`--seed=${seed}`);
    execFileSync(process.execPath, args, { stdio: 'pipe' });
    const read = (f: string) => parseCsv(readFileSync(join(dir, f), 'utf8'));
    return {
      bankLines: read('bank_lines.csv').map((r) => ({
        id: r.bank_line_id,
        transaction_date: r.date,
        amount_pence: Math.round(Number(r.amount) * 100),
        reference: r.reference || null,
      })),
      donations: read('donations.csv').map((r) => ({
        id: r.donation_id,
        transaction_date: r.date,
        amount_pence: Number(r.amount_pence),
        source_reference: r.reference,
      })),
      expected: new Map(read('expected_matches.csv').map((r) => [r.bank_line_id, r.donation_id])),
      decoys: new Set(read('expected_unmatched.csv').filter((r) => r.side === 'bank_line').map((r) => r.id)),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function evaluate(data: SeedData): Evaluation {
  const ranked = rankCandidates(data.bankLines, data.donations);
  const refs = new Map(data.bankLines.map((l) => [l.id, l.reference]));
  const result: Evaluation = { total: 0, top1: 0, top3: 0, misses: [], decoysWithCandidates: [] };
  for (const r of ranked) {
    const want = data.expected.get(r.bank_line_id);
    if (!want) {
      if (data.decoys.has(r.bank_line_id) && r.candidates.length) result.decoysWithCandidates.push(r);
      continue;
    }
    result.total++;
    const idx = r.candidates.findIndex((c) => c.donation_id === want);
    if (idx === 0) result.top1++;
    if (idx >= 0) result.top3++;
    if (idx !== 0) {
      result.misses.push({
        bank_line_id: r.bank_line_id,
        bank_reference: refs.get(r.bank_line_id) ?? null,
        expected_donation_id: want,
        expected_rank: idx >= 0 ? idx + 1 : null,
        top: r.candidates,
      });
    }
  }
  return result;
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}% (${n}/${d})`;

export function formatReport(e: Evaluation): string {
  const out = [
    `Top-1 accuracy: ${pct(e.top1, e.total)}`,
    `Top-3 accuracy: ${pct(e.top3, e.total)}`,
    '',
    `Misses (correct donation not ranked first): ${e.misses.length}`,
  ];
  for (const m of e.misses) {
    out.push(
      `- line ${m.bank_line_id} ref=${m.bank_reference ?? '(none)'}: expected ${m.expected_donation_id} ` +
        `ranked ${m.expected_rank ?? 'not in top 3'}`
    );
    for (const c of m.top) {
      const mark = c.donation_id === m.expected_donation_id ? '*' : ' ';
      out.push(`    ${mark} ${c.donation_id} ${c.confidence.toFixed(3)}  ${c.reasons.join('; ')}`);
    }
  }
  out.push('', `Decoy lines given candidates: ${e.decoysWithCandidates.length}`);
  for (const d of e.decoysWithCandidates) {
    const c = d.candidates[0];
    out.push(`- line ${d.bank_line_id}: top ${c.donation_id} ${c.confidence.toFixed(3)}  ${c.reasons.join('; ')}`);
  }
  return out.join('\n');
}
