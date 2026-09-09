import { lastDayOfMonth } from '@/lib/utils/date';
import type { AppealSummary } from '@/lib/types/v2';

export interface PeriodDonation {
  id: string;
  amount_pence: number;
  appeal_id: string | null;
}

export interface PeriodAppeal {
  id: string;
  code: string;
  name: string;
}

export interface PeriodSummary {
  donation_count: number;
  total_pence: number;
  summary_by_appeal: AppealSummary[];
}

/** Zero-padded period label, e.g. 2024-01. */
export function periodLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Inclusive first and last dates of a calendar month, as YYYY-MM-DD. */
export function periodRange(year: number, month: number): { from: string; to: string } {
  return { from: `${periodLabel(year, month)}-01`, to: lastDayOfMonth(year, month) };
}

/** The period a YYYY-MM-DD date belongs to, or null if it cannot be read. */
export function parsePeriod(date: string): { year: number; month: number } | null {
  const [yearStr, monthStr] = (date ?? '').split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Totals for a closing period, plus a per-appeal breakdown.
 *
 * Donations with no appeal count toward the totals but appear in no appeal
 * line. An appeal referenced by a donation but missing from `appeals` is
 * omitted from the breakdown rather than reported without its code and name,
 * so the per-appeal totals may sum to less than total_pence.
 */
export function summarisePeriod(params: {
  donations: readonly PeriodDonation[];
  appeals: readonly PeriodAppeal[];
}): PeriodSummary {
  const { donations, appeals } = params;

  const appealTotals = new Map<string, { count: number; total_pence: number }>();
  for (const d of donations) {
    if (!d.appeal_id) continue;
    const prev = appealTotals.get(d.appeal_id) ?? { count: 0, total_pence: 0 };
    appealTotals.set(d.appeal_id, {
      count: prev.count + 1,
      total_pence: prev.total_pence + d.amount_pence,
    });
  }

  const summary_by_appeal: AppealSummary[] = appeals
    .filter((a) => appealTotals.has(a.id))
    .map((a) => ({
      appeal_id: a.id,
      appeal_code: a.code,
      appeal_name: a.name,
      count: appealTotals.get(a.id)?.count ?? 0,
      total_pence: appealTotals.get(a.id)?.total_pence ?? 0,
    }));

  return {
    donation_count: donations.length,
    total_pence: donations.reduce((sum, d) => sum + d.amount_pence, 0),
    summary_by_appeal,
  };
}
