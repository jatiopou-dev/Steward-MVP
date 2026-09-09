import { EXPENSE_CATEGORIES } from '@/utils/domainOptions';

/** The UK charity fiscal year runs 1 April to 31 March. */
export const FISCAL_YEAR_START_MONTH = 4;

const EXPENSE_SET: ReadonlySet<string> = new Set(EXPENSE_CATEGORIES);

export interface BudgetLineInput {
  category: string;
  amount_pence: number;
}

export interface BudgetTransaction {
  category: string | null;
  amount_pence: number; // income positive, expenditure negative
  date: string; // YYYY-MM-DD
}

export interface BudgetReportLine {
  category: string;
  kind: 'expense' | 'income';
  budget_pence: number;
  actual_pence: number;
  remaining_pence: number;
  /** Whole-number percent of budget consumed; 0 when nothing is budgeted. */
  percent_used: number;
  over_budget: boolean;
}

export interface BudgetReport {
  fiscal_year: number;
  from: string;
  to: string;
  lines: BudgetReportLine[];
  total_budget_pence: number;
  total_actual_pence: number;
}

/** The fiscal year a date falls in — January to March belong to the prior year. */
export function fiscalYearOf(date: string): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month < FISCAL_YEAR_START_MONTH ? year - 1 : year;
}

/** Inclusive date range of a fiscal year, as YYYY-MM-DD. */
export function fiscalYearRange(fiscal_year: number): { from: string; to: string } {
  return { from: `${fiscal_year}-04-01`, to: `${fiscal_year + 1}-03-31` };
}

export function isExpenseCategory(category: string): boolean {
  return EXPENSE_SET.has(category);
}

/**
 * Actual movement on a category, expressed as a positive figure in the
 * direction natural to that category: spend for expenses, receipts for income.
 * A refund on an expense category therefore reduces the spend.
 */
export function actualForCategory(
  category: string,
  transactions: readonly BudgetTransaction[]
): number {
  const sum = transactions
    .filter((t) => t.category === category)
    .reduce((n, t) => n + t.amount_pence, 0);
  const signed = isExpenseCategory(category) ? -sum : sum;
  // Negating a zero sum yields -0, which formats as "-£0.00".
  return signed === 0 ? 0 : signed;
}

/** Percent of budget consumed, rounded to a whole number. 0 when unbudgeted. */
export function percentUsed(actual_pence: number, budget_pence: number): number {
  if (budget_pence <= 0) return 0;
  return Math.round((actual_pence / budget_pence) * 100);
}

/**
 * Combine budget lines with the transactions falling inside the fiscal year.
 *
 * Transactions outside the year are ignored, so the caller may pass a wider set.
 * Lines are returned in the order given.
 */
export function buildBudgetReport(params: {
  fiscal_year: number;
  budgets: readonly BudgetLineInput[];
  transactions: readonly BudgetTransaction[];
}): BudgetReport {
  const { fiscal_year, budgets, transactions } = params;
  const { from, to } = fiscalYearRange(fiscal_year);

  const inYear = transactions.filter((t) => t.date >= from && t.date <= to);

  const lines = budgets.map((b): BudgetReportLine => {
    const actual_pence = actualForCategory(b.category, inYear);
    return {
      category: b.category,
      kind: isExpenseCategory(b.category) ? 'expense' : 'income',
      budget_pence: b.amount_pence,
      actual_pence,
      remaining_pence: b.amount_pence - actual_pence,
      percent_used: percentUsed(actual_pence, b.amount_pence),
      over_budget: actual_pence > b.amount_pence,
    };
  });

  return {
    fiscal_year,
    from,
    to,
    lines,
    total_budget_pence: lines.reduce((n, l) => n + l.budget_pence, 0),
    total_actual_pence: lines.reduce((n, l) => n + l.actual_pence, 0),
  };
}
