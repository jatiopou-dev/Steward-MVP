import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getBudgetLines, getCurrentFiscalYear, setBudgetLine } from "@/app/actions/budgets";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/utils/domainOptions";

export default async function EditBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const currentFy = await getCurrentFiscalYear();
  const parsedFy = Number(fy);
  const fiscalYear = Number.isInteger(parsedFy) ? parsedFy : currentFy;

  const lines = await getBudgetLines(fiscalYear);
  const byCategory = new Map(lines.map((l) => [l.category, l]));

  const section = (title: string, categories: readonly string[]) => (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
      </div>
      {categories.map((category) => {
        const existing = byCategory.get(category);
        return (
          <form
            key={category}
            action={setBudgetLine}
            className="bgt-row"
            style={{ alignItems: "center", gap: ".75rem" }}
          >
            <input type="hidden" name="fiscal_year" value={fiscalYear} />
            <input type="hidden" name="category" value={category} />
            <div className="bgt-cat">
              <label htmlFor={`amount-${category}`}>{category}</label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ color: "var(--stone2)" }}>£</span>
              <input
                id={`amount-${category}`}
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={existing ? (existing.amount_pence / 100).toFixed(2) : ""}
                placeholder="0.00"
                className="input"
                style={{ maxWidth: "9rem" }}
              />
            </div>
            <button type="submit" className="btn btn-outline btn-sm">
              Save
            </button>
          </form>
        );
      })}
    </div>
  );

  return (
    <>
      <Topbar
        title="Set budgets"
        subtitle={`FY ${fiscalYear} · 1 April ${fiscalYear} to 31 March ${fiscalYear + 1}`}
        actions={
          <Link href={`/dashboard/budget?fy=${fiscalYear}`} className="btn btn-outline btn-sm">
            Back to tracker
          </Link>
        }
      />
      <div className="content">
        <p style={{ color: "var(--stone2)", marginBottom: ".75rem" }}>
          Set an amount for each category you want to track. Leaving a category at zero
          removes its budget. Actuals come from your transactions, so there is nothing to
          enter here beyond the plan.
        </p>
        {section("Expenditure", EXPENSE_CATEGORIES)}
        {section("Income targets", INCOME_CATEGORIES)}
      </div>
    </>
  );
}
