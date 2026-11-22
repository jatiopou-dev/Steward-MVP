import { periodRange } from './period';
import type { BankLineCandidates } from './candidates';

export const MATCH_DATE_WINDOW_DAYS = 5;

export interface DecidedPair {
  bank_line_id: string;
  donation_id: string;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Bank lines dated in the month are ranked against donations dated up to the
 * match window either side of it.
 */
export function suggestionWindow(year: number, month: number) {
  const { from, to } = periodRange(year, month);
  return {
    linesFrom: from,
    linesTo: to,
    donationsFrom: shiftDate(from, -MATCH_DATE_WINDOW_DAYS),
    donationsTo: shiftDate(to, MATCH_DATE_WINDOW_DAYS),
  };
}

/** Removes rejected pairs, then keeps the best `topN` remaining candidates per line. */
export function dropRejected(
  ranked: readonly BankLineCandidates[],
  rejected: readonly DecidedPair[],
  topN = 3
): BankLineCandidates[] {
  const key = (lineId: string, donationId: string) => `${lineId}|${donationId}`;
  const skip = new Set(rejected.map((r) => key(r.bank_line_id, r.donation_id)));
  return ranked.map((r) => ({
    bank_line_id: r.bank_line_id,
    candidates: r.candidates.filter((c) => !skip.has(key(r.bank_line_id, c.donation_id))).slice(0, topN),
  }));
}
