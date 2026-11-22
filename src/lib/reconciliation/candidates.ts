/**
 * Ranks candidate donations for each open bank line.
 *
 * Pure and deterministic. Each candidate is scored on three signals:
 * reference similarity (0.5), amount (0.3) and date (0.2). A donation is only
 * a candidate when it is dated within `maxDateGapDays` of the line and its
 * amount matches: exactly, within `amountTolerance`, or exactly together with
 * another open line (a donation split across two lines). Callers pass only open bank
 * lines and donations that still need matching; nothing is filtered here.
 */
import { dayGap, referenceScore, type MatchBankLine, type MatchDonation } from './match';

export type RankBankLine = Pick<MatchBankLine, 'id' | 'transaction_date' | 'amount_pence' | 'reference'>;
export type RankDonation = Pick<MatchDonation, 'id' | 'transaction_date' | 'amount_pence' | 'source_reference'>;

export interface RankedCandidate {
  donation_id: string;
  /** 0 to 1. */
  confidence: number;
  /** Which signals matched, e.g. `reference exact`, `amount exact`, `date +2d`. */
  reasons: string[];
  /** The other half of a split donation, when the amount matched only together with it. */
  split_with: string | null;
}

export interface BankLineCandidates {
  bank_line_id: string;
  candidates: RankedCandidate[];
}

export interface RankOptions {
  /** Candidates returned per line. Default 3. */
  topN?: number;
  /** Default 5. */
  maxDateGapDays?: number;
  /** Largest relative amount difference still scored as "near". Default 0.05 (5%). */
  amountTolerance?: number;
}

const WEIGHTS = { reference: 0.5, amount: 0.3, date: 0.2 };
/** A split's amount evidence is slightly weaker than a single line that pays the whole donation. */
const SPLIT_AMOUNT_FACTOR = 0.9;

interface AmountMatch {
  score: number;
  reason: string;
  splitWith: string | null;
}

function amountScore(actual: number, expected: number, tolerance: number): { score: number; reason: string } | null {
  if (actual === expected) return { score: 1, reason: 'amount exact' };
  const diff = (actual - expected) / expected;
  if (Math.abs(diff) > tolerance) return null;
  const pct = `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`;
  return { score: 1 - Math.abs(diff) / tolerance, reason: `amount near (${pct})` };
}

function matchAmount(
  line: RankBankLine,
  donation: RankDonation,
  partners: readonly RankBankLine[],
  tolerance: number
): AmountMatch | null {
  const single = amountScore(line.amount_pence, donation.amount_pence, tolerance);
  if (single) return { ...single, splitWith: null };
  if (line.amount_pence >= donation.amount_pence) return null;

  // A split must add up exactly, and the other line must not carry a reference that points elsewhere.
  let best: (AmountMatch & { refScore: number }) | null = null;
  for (const other of partners) {
    if (other.id === line.id || line.amount_pence + other.amount_pence !== donation.amount_pence) continue;
    const ref = referenceScore(other.reference, donation.source_reference);
    if (ref === 0) continue;
    const refScore = ref ?? 0;
    if (!best || refScore > best.refScore) {
      best = { score: SPLIT_AMOUNT_FACTOR, reason: `split with line ${other.id}`, splitWith: other.id, refScore };
    }
  }
  return best && { score: best.score, reason: best.reason, splitWith: best.splitWith };
}

function referenceReason(score: number | null): string {
  if (score === null) return 'reference missing';
  if (score === 1) return 'reference exact';
  if (score > 0) return 'reference fuzzy';
  return 'reference differs';
}

export function rankCandidates(
  bankLines: readonly RankBankLine[],
  donations: readonly RankDonation[],
  options: RankOptions = {}
): BankLineCandidates[] {
  const topN = options.topN ?? 3;
  const maxGap = options.maxDateGapDays ?? 5;
  const tolerance = options.amountTolerance ?? 0.05;
  const credits = bankLines.filter((l) => l.amount_pence > 0);

  return bankLines.map((line) => {
    if (line.amount_pence <= 0) return { bank_line_id: line.id, candidates: [] };
    const scored: (RankedCandidate & { gap: number })[] = [];
    for (const donation of donations) {
      const gap = dayGap(line.transaction_date, donation.transaction_date);
      if (Math.abs(gap) > maxGap) continue;
      const partners = credits.filter(
        (l) => Math.abs(dayGap(l.transaction_date, donation.transaction_date)) <= maxGap
      );
      const amount = matchAmount(line, donation, partners, tolerance);
      if (!amount) continue;
      const ref = referenceScore(line.reference, donation.source_reference);
      const dateScore = maxGap > 0 ? 1 - Math.abs(gap) / maxGap : 1;
      const confidence =
        WEIGHTS.reference * (ref ?? 0) + WEIGHTS.amount * amount.score + WEIGHTS.date * dateScore;
      scored.push({
        donation_id: donation.id,
        confidence: Math.round(confidence * 1000) / 1000,
        reasons: [
          referenceReason(ref),
          amount.reason,
          gap === 0 ? 'date same day' : `date ${gap > 0 ? '+' : ''}${gap}d`,
        ],
        split_with: amount.splitWith,
        gap,
      });
    }
    scored.sort(
      (a, b) =>
        b.confidence - a.confidence || Math.abs(a.gap) - Math.abs(b.gap) || a.donation_id.localeCompare(b.donation_id)
    );
    return {
      bank_line_id: line.id,
      candidates: scored.slice(0, topN).map((c) => ({
        donation_id: c.donation_id,
        confidence: c.confidence,
        reasons: c.reasons,
        split_with: c.split_with,
      })),
    };
  });
}
