import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { getBudgetReport, getCurrentFiscalYear } from "@/app/actions/budgets";
import type { BudgetReportLine } from "@/lib/budget/calc";
import Link from "next/link";

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

/**
 * Three states, not two: a line at 90% has not broken the budget but is the
 * one a treasurer needs to see coming. The colour is set in CSS from this
 * attribute so the bar keeps its meaning in both themes.
 */
function barState(line: BudgetReportLine): "over" | "near" | "ok" {
  if (line.over_budget) return "over";
  if (line.percent_used >= 85) return "near";
  return "ok";
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const currentFy = await getCurrentFiscalYear();
  const parsedFy = Number(fy);
  const fiscalYear = Number.isInteger(parsedFy) ? parsedFy : currentFy;

  const report = await getBudgetReport(fiscalYear);

  const expenseLines = report.lines.filter((l) => l.kind === "expense");
  const incomeLines = report.lines.filter((l) => l.kind === "income");
  const budgetedSpend = expenseLines.reduce((n, l) => n + l.budget_pence, 0);
  const actualSpend = expenseLines.reduce((n, l) => n + l.actual_pence, 0);
  const overspent = expenseLines.filter((l) => l.over_budget).length;

  return (
    <>
      <Topbar
        title="Budget tracker"
        subtitle={`FY ${fiscalYear} · ${report.from} to ${report.to}`}
        actions={
          <Link href={`/dashboard/budget/edit?fy=${fiscalYear}`} className="btn btn-outline btn-sm">
            Set budgets
          </Link>
        }
      />
      <div className="content">
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="kpi">
            <div className="kpi-lbl">Budgeted expenditure</div>
            <div className="kpi-val">{formatGBP(budgetedSpend)}</div>
            <div className="kpi-meta neutral">
              {expenseLines.length} {expenseLines.length === 1 ? "category" : "categories"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Spent so far</div>
            <div className="kpi-val">{formatGBP(actualSpend)}</div>
            <div className="kpi-meta neutral">
              {budgetedSpend > 0
                ? `${Math.round((actualSpend / budgetedSpend) * 100)}% of budget`
                : "No budget set"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Over budget</div>
            <div className="kpi-val">{overspent}</div>
            <div className={`kpi-meta ${overspent > 0 ? "down" : "up"}`}>
              {overspent > 0 ? "Needs attention" : "All within budget"}
            </div>
          </div>
        </div>

        {report.lines.length === 0 ? (
          <div className="card">
            <div className="card-head">
              <div className="card-title">No budgets set for FY {fiscalYear}</div>
            </div>
            <p style={{ color: "var(--stone2)", padding: "0 0 .5rem" }}>
              Set a budget for each category to track spending against plan. Actuals are
              drawn from your transactions automatically.
            </p>
          </div>
        ) : (
          <>
            {expenseLines.length > 0 && (
              <BudgetTable
                title={`Expenditure — FY ${fiscalYear}`}
                lines={expenseLines}
                actualLabel="Actual / Budget"
              />
            )}
            {incomeLines.length > 0 && (
              <BudgetTable
                title={`Income — FY ${fiscalYear}`}
                lines={incomeLines}
                actualLabel="Received / Target"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

function BudgetTable({
  title,
  lines,
  actualLabel,
}: {
  title: string;
  lines: BudgetReportLine[];
  actualLabel: string;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {/* What the pair of figures means — "Actual / Budget" for spend,
            "Received / Target" for income. It reads once here rather than
            as a column header: each row keeps the figures beside the
            category, with the bar beneath them. */}
        <div className="card-sub">{actualLabel}</div>
      </div>
      {lines.map((line) => (
        <div className="bgt-row" key={line.category}>
          <div className="bgt-cat">
            <span>{line.category}</span>
            <span className="bgt-nums">
              {formatGBP(line.actual_pence)} / {formatGBP(line.budget_pence)}
              {line.over_budget && (
                <span style={{ color: "var(--rust)", marginLeft: ".4rem" }}>
                  +{formatGBP(line.actual_pence - line.budget_pence)}
                </span>
              )}
            </span>
          </div>
          <div className="bgt-track">
            <div
              className="bgt-fill"
              data-state={barState(line)}
              style={{
                "--fill": Math.min(line.percent_used, 100) / 100,
              } as React.CSSProperties}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
