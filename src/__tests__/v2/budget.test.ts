import { describe, it, expect } from 'vitest';
import {
  fiscalYearOf,
  fiscalYearRange,
  isExpenseCategory,
  actualForCategory,
  percentUsed,
  buildBudgetReport,
  FISCAL_YEAR_START_MONTH,
  type BudgetTransaction,
} from '@/lib/budget/calc';

const tx = (category: string | null, amount_pence: number, date = '2026-06-15'): BudgetTransaction =>
  ({ category, amount_pence, date });

// ── fiscal year ───────────────────────────────────────────────────────────

describe('fiscal year', () => {
  it('starts in April', () => {
    expect(FISCAL_YEAR_START_MONTH).toBe(4);
  });

  it('places 1 April in the year that starts then', () => {
    expect(fiscalYearOf('2026-04-01')).toBe(2026);
  });

  it('places December in the year that started that April', () => {
    expect(fiscalYearOf('2026-12-31')).toBe(2026);
  });

  it('places January in the previous fiscal year', () => {
    expect(fiscalYearOf('2027-01-15')).toBe(2026);
  });

  it('places 31 March in the previous fiscal year', () => {
    expect(fiscalYearOf('2027-03-31')).toBe(2026);
  });

  it('rolls over on 1 April', () => {
    expect(fiscalYearOf('2027-04-01')).toBe(2027);
  });

  it('spans April to the following March', () => {
    expect(fiscalYearRange(2026)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
  });
});

// ── category direction ────────────────────────────────────────────────────

describe('isExpenseCategory', () => {
  it('recognises an expense category', () => {
    expect(isExpenseCategory('Building & facilities')).toBe(true);
  });

  it('does not treat income as expense', () => {
    expect(isExpenseCategory('Regular giving')).toBe(false);
  });

  it('treats an unknown category as income-facing', () => {
    expect(isExpenseCategory('Nonsense')).toBe(false);
  });
});

// ── actuals ───────────────────────────────────────────────────────────────

describe('actualForCategory', () => {
  it('reports expenditure as a positive spend figure', () => {
    expect(actualForCategory('Utilities', [tx('Utilities', -5000)])).toBe(5000);
  });

  it('reports income as a positive receipts figure', () => {
    expect(actualForCategory('Regular giving', [tx('Regular giving', 5000)])).toBe(5000);
  });

  it('sums several transactions in the same category', () => {
    expect(
      actualForCategory('Utilities', [tx('Utilities', -5000), tx('Utilities', -2500)])
    ).toBe(7500);
  });

  it('lets a refund reduce expenditure', () => {
    expect(
      actualForCategory('Utilities', [tx('Utilities', -5000), tx('Utilities', 1000)])
    ).toBe(4000);
  });

  it('ignores other categories', () => {
    expect(
      actualForCategory('Utilities', [tx('Utilities', -5000), tx('Administration', -9999)])
    ).toBe(5000);
  });

  it('ignores uncategorised transactions', () => {
    expect(actualForCategory('Utilities', [tx(null, -9999)])).toBe(0);
  });

  it('returns 0 when nothing matches', () => {
    expect(actualForCategory('Utilities', [])).toBe(0);
  });
});

// ── percent ───────────────────────────────────────────────────────────────

describe('percentUsed', () => {
  it('computes a whole-number percent', () => {
    expect(percentUsed(2500, 10000)).toBe(25);
  });

  it('rounds to the nearest percent', () => {
    expect(percentUsed(3333, 10000)).toBe(33);
  });

  it('returns 0 when nothing is budgeted, rather than dividing by zero', () => {
    expect(percentUsed(5000, 0)).toBe(0);
  });

  it('can exceed 100', () => {
    expect(percentUsed(15000, 10000)).toBe(150);
  });
});

// ── report ────────────────────────────────────────────────────────────────

describe('buildBudgetReport', () => {
  it('returns an empty report when nothing is budgeted', () => {
    const r = buildBudgetReport({ fiscal_year: 2026, budgets: [], transactions: [] });
    expect(r.lines).toEqual([]);
    expect(r.total_budget_pence).toBe(0);
    expect(r.total_actual_pence).toBe(0);
    expect(r.from).toBe('2026-04-01');
    expect(r.to).toBe('2027-03-31');
  });

  it('pairs a budget with its spend', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -2500)],
    });
    expect(r.lines[0]).toEqual({
      category: 'Utilities',
      kind: 'expense',
      budget_pence: 10000,
      actual_pence: 2500,
      remaining_pence: 7500,
      percent_used: 25,
      over_budget: false,
    });
  });

  it('flags a line that has overspent', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -12000)],
    });
    expect(r.lines[0].over_budget).toBe(true);
    expect(r.lines[0].remaining_pence).toBe(-2000);
    expect(r.lines[0].percent_used).toBe(120);
  });

  it('does not flag a line exactly on budget', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -10000)],
    });
    expect(r.lines[0].over_budget).toBe(false);
    expect(r.lines[0].percent_used).toBe(100);
  });

  it('excludes transactions before the fiscal year', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -5000, '2026-03-31')],
    });
    expect(r.lines[0].actual_pence).toBe(0);
  });

  it('excludes transactions after the fiscal year', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -5000, '2027-04-01')],
    });
    expect(r.lines[0].actual_pence).toBe(0);
  });

  it('includes transactions on both boundary dates', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Utilities', amount_pence: 10000 }],
      transactions: [tx('Utilities', -1000, '2026-04-01'), tx('Utilities', -1000, '2027-03-31')],
    });
    expect(r.lines[0].actual_pence).toBe(2000);
  });

  it('handles income and expense lines together', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [
        { category: 'Regular giving', amount_pence: 100000 },
        { category: 'Utilities', amount_pence: 10000 },
      ],
      transactions: [tx('Regular giving', 40000), tx('Utilities', -2500)],
    });
    expect(r.lines.map((l) => l.kind)).toEqual(['income', 'expense']);
    expect(r.lines[0].actual_pence).toBe(40000);
    expect(r.lines[1].actual_pence).toBe(2500);
    expect(r.total_budget_pence).toBe(110000);
    expect(r.total_actual_pence).toBe(42500);
  });

  it('keeps a budgeted line with no activity', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [{ category: 'Mission giving', amount_pence: 40000 }],
      transactions: [],
    });
    expect(r.lines[0].actual_pence).toBe(0);
    expect(r.lines[0].remaining_pence).toBe(40000);
    expect(r.lines[0].percent_used).toBe(0);
  });

  it('preserves the order of the budget lines given', () => {
    const r = buildBudgetReport({
      fiscal_year: 2026,
      budgets: [
        { category: 'Worship & music', amount_pence: 1 },
        { category: 'Administration', amount_pence: 2 },
        { category: 'Utilities', amount_pence: 3 },
      ],
      transactions: [],
    });
    expect(r.lines.map((l) => l.category)).toEqual([
      'Worship & music',
      'Administration',
      'Utilities',
    ]);
  });
});
