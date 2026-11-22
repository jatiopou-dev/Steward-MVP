/**
 * Proposes matches between bank statement lines and imported donations.
 *
 * Pure and deterministic: callers load the rows, this decides which pair up.
 * A match needs an exact amount (one line, or two lines that sum to the
 * donation) dated within `maxDateGapDays`. References are compared fuzzily
 * and donor names add evidence. A pairing backed by amount and date alone is
 * accepted only when it is the single possibility on both sides.
 */

export interface MatchBankLine {
  id: string;
  /** YYYY-MM-DD */
  transaction_date: string;
  amount_pence: number;
  reference: string | null;
  counterparty_name: string | null;
}

export interface MatchDonation {
  id: string;
  /** YYYY-MM-DD */
  transaction_date: string;
  amount_pence: number;
  source_reference: string;
  donor_name: string | null;
}

export type MatchType = 'one_to_one' | 'split';
export type MatchEvidence = 'reference_exact' | 'reference_fuzzy' | 'donor_name' | 'amount_date_only';

export interface ProposedMatch {
  donation_id: string;
  bank_line_ids: string[];
  match_type: MatchType;
  /** 0 to 1. */
  confidence: number;
  evidence: MatchEvidence[];
}

export interface MatchResult {
  matches: ProposedMatch[];
  unmatched_donation_ids: string[];
  unmatched_bank_line_ids: string[];
}

export interface MatchOptions {
  maxDateGapDays?: number;
}

const DAY_MS = 86_400_000;
const LOOKALIKES: Record<string, string> = { O: '0', I: '1', L: '1', S: '5', B: '8' };
const PART_MARKER = /\s*\b(PT|PART)\s*\d+\s*$/i;
const AMOUNT_ONLY_CONFIDENCE = 0.3;
const SPLIT_PENALTY = 0.05;

export function dayGap(bankDate: string, donationDate: string): number {
  return Math.round((Date.parse(bankDate) - Date.parse(donationDate)) / DAY_MS);
}

/** Upper-case, alphanumerics only, with look-alike letters folded to digits. */
export function normalizeReference(ref: string): string {
  return ref
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[OILSB]/g, (c) => LOOKALIKES[c]);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * How well a bank reference matches a donation reference: 1 exact, 0.8 one
 * edit away, 0.5 two edits away, 0 different. Null when the bank line has no
 * reference. A trailing part marker (`PT1`, `PART 2`) is ignored.
 */
export function referenceScore(bankRef: string | null, donationRef: string): number | null {
  if (!bankRef || !normalizeReference(bankRef)) return null;
  const target = normalizeReference(donationRef);
  if (!target) return 0;
  const full = normalizeReference(bankRef);
  let best = Math.min(levenshtein(full, target), levenshtein(normalizeReference(bankRef.replace(PART_MARKER, '')), target));
  // A corrupted part marker may survive stripping; compare the leading characters, at one edit's cost.
  if (target.length >= 6 && full.length > target.length && full.length - target.length <= 4) {
    for (const len of [target.length - 1, target.length, target.length + 1]) {
      best = Math.min(best, levenshtein(full.slice(0, len), target) + 1);
    }
  }
  if (best === 0) return 1;
  if (best === 1) return 0.8;
  if (best === 2 && target.length >= 6) return 0.5;
  return 0;
}

const nameTokens = (s: string) => s.toUpperCase().split(/[^A-Z]+/).filter(Boolean);

/** 1 when the counterparty contains the donor's surname, 0.7 for a close misspelling, else 0. */
export function nameScore(counterparty: string | null, donorName: string | null): number {
  if (!counterparty || !donorName) return 0;
  const surname = nameTokens(donorName).at(-1);
  if (!surname) return 0;
  const tokens = nameTokens(counterparty);
  if (tokens.includes(surname)) return 1;
  if (surname.length >= 5 && tokens.some((t) => Math.abs(t.length - surname.length) <= 1 && levenshtein(t, surname) <= 2)) {
    return 0.7;
  }
  return 0;
}

interface LineEvidence {
  ref: number | null;
  name: number;
  gap: number;
  score: number;
}

function lineEvidence(line: MatchBankLine, donation: MatchDonation, maxGap: number): LineEvidence {
  const ref = referenceScore(line.reference, donation.source_reference);
  const name = nameScore(line.counterparty_name, donation.donor_name);
  const gap = dayGap(line.transaction_date, donation.transaction_date);
  const score = 0.6 * (ref ?? 0) + 0.3 * name + 0.1 * (1 - Math.abs(gap) / (maxGap + 1));
  return { ref, name, gap, score };
}

/** A reference that points elsewhere, with no name to vouch for the line. */
const contradicts = (e: LineEvidence) => e.ref === 0 && e.name === 0;
const supports = (e: LineEvidence) => (e.ref ?? 0) > 0 || e.name > 0;

function evidenceOf(list: LineEvidence[]): MatchEvidence[] {
  const out = new Set<MatchEvidence>();
  for (const e of list) {
    if (e.ref === 1) out.add('reference_exact');
    else if ((e.ref ?? 0) > 0) out.add('reference_fuzzy');
    if (e.name > 0) out.add('donor_name');
  }
  return out.size ? [...out] : ['amount_date_only'];
}

interface Candidate {
  donation: MatchDonation;
  lines: MatchBankLine[];
  evidence: LineEvidence[];
  score: number;
}

const byScore = (a: Candidate, b: Candidate) =>
  b.score - a.score ||
  a.evidence.reduce((s, e) => s + Math.abs(e.gap), 0) - b.evidence.reduce((s, e) => s + Math.abs(e.gap), 0) ||
  a.donation.id.localeCompare(b.donation.id) ||
  a.lines.map((l) => l.id).join().localeCompare(b.lines.map((l) => l.id).join());

export function matchBankLines(
  bankLines: readonly MatchBankLine[],
  donations: readonly MatchDonation[],
  options: MatchOptions = {}
): MatchResult {
  const maxGap = options.maxDateGapDays ?? 5;
  const credits = bankLines.filter((l) => l.amount_pence > 0);
  const inWindow = (d: MatchDonation) =>
    credits.filter((l) => Math.abs(dayGap(l.transaction_date, d.transaction_date)) <= maxGap);

  const candidates: Candidate[] = [];
  const amountOnly: Candidate[] = [];
  for (const donation of donations) {
    const window = inWindow(donation);
    for (const line of window) {
      if (line.amount_pence !== donation.amount_pence) continue;
      const e = lineEvidence(line, donation, maxGap);
      const c = { donation, lines: [line], evidence: [e], score: e.score };
      if (supports(e)) candidates.push(c);
      else if (e.ref === null) amountOnly.push(c);
    }
    const parts = window.filter((l) => l.amount_pence < donation.amount_pence);
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[i].amount_pence + parts[j].amount_pence !== donation.amount_pence) continue;
        const ev = [lineEvidence(parts[i], donation, maxGap), lineEvidence(parts[j], donation, maxGap)];
        if (ev.some(contradicts)) continue;
        const strongRef = ev.some((e) => (e.ref ?? 0) >= 0.5);
        if (!strongRef && !ev.every((e) => e.name > 0)) continue;
        const [a, b] = parts[i].transaction_date <= parts[j].transaction_date ? [0, 1] : [1, 0];
        candidates.push({
          donation,
          lines: [[parts[i], parts[j]][a], [parts[i], parts[j]][b]],
          evidence: [ev[a], ev[b]],
          score: (ev[0].score + ev[1].score) / 2 - SPLIT_PENALTY,
        });
      }
    }
  }

  const usedDonations = new Set<string>();
  const usedLines = new Set<string>();
  const matches: ProposedMatch[] = [];
  const accept = (c: Candidate, confidence: number) => {
    usedDonations.add(c.donation.id);
    c.lines.forEach((l) => usedLines.add(l.id));
    matches.push({
      donation_id: c.donation.id,
      bank_line_ids: c.lines.map((l) => l.id),
      match_type: c.lines.length > 1 ? 'split' : 'one_to_one',
      confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 1000) / 1000,
      evidence: evidenceOf(c.evidence),
    });
  };

  for (const c of candidates.sort(byScore)) {
    if (usedDonations.has(c.donation.id) || c.lines.some((l) => usedLines.has(l.id))) continue;
    accept(c, c.score);
  }

  // Amount and date only: accept a pairing when it is the sole option for both the line and the donation.
  let changed = true;
  while (changed) {
    changed = false;
    const open = amountOnly.filter((c) => !usedDonations.has(c.donation.id) && !usedLines.has(c.lines[0].id));
    for (const c of open.sort(byScore)) {
      const sameLine = open.filter((o) => o.lines[0].id === c.lines[0].id && !usedDonations.has(o.donation.id));
      const sameDonation = open.filter((o) => o.donation.id === c.donation.id && !usedLines.has(o.lines[0].id));
      if (sameLine.length === 1 && sameDonation.length === 1 && !usedDonations.has(c.donation.id)) {
        accept(c, AMOUNT_ONLY_CONFIDENCE);
        changed = true;
      }
    }
  }

  const order = new Map(donations.map((d, i) => [d.id, i]));
  matches.sort((a, b) => (order.get(a.donation_id) ?? 0) - (order.get(b.donation_id) ?? 0));
  return {
    matches,
    unmatched_donation_ids: donations.filter((d) => !usedDonations.has(d.id)).map((d) => d.id),
    unmatched_bank_line_ids: bankLines.filter((l) => !usedLines.has(l.id)).map((l) => l.id),
  };
}
