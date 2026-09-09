"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/utils/domainOptions";
import {
  buildBudgetReport,
  fiscalYearOf,
  type BudgetReport,
  type BudgetTransaction,
} from "@/lib/budget/calc";

const budgetCategories = new Set<string>([
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
]);

export type BudgetLine = {
  id: string;
  fiscal_year: number;
  category: string;
  amount_pence: number;
  notes: string | null;
};

async function requireOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (error || !profile?.org_id) {
    throw new Error("Could not find your organisation. Please re-login.");
  }
  return profile.org_id as string;
}

/** The fiscal year that today falls in. */
export async function getCurrentFiscalYear(): Promise<number> {
  return fiscalYearOf(new Date().toISOString().slice(0, 10));
}

export async function getBudgetLines(fiscalYear: number): Promise<BudgetLine[]> {
  const supabase = await createClient();
  const orgId = await requireOrgId(supabase);

  const { data, error } = await supabase
    .from("budgets")
    .select("id, fiscal_year, category, amount_pence, notes")
    .eq("org_id", orgId)
    .eq("fiscal_year", fiscalYear)
    .order("category");

  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetLine[];
}

/** Budget lines for the year paired with actuals drawn from transactions. */
export async function getBudgetReport(fiscalYear: number): Promise<BudgetReport> {
  const supabase = await createClient();
  const orgId = await requireOrgId(supabase);

  const [{ data: budgets, error: budgetError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("category, amount_pence")
        .eq("org_id", orgId)
        .eq("fiscal_year", fiscalYear)
        .order("category"),
      supabase
        .from("transactions")
        .select("category, amount_pence, date")
        .eq("org_id", orgId)
        .gte("date", `${fiscalYear}-04-01`)
        .lte("date", `${fiscalYear + 1}-03-31`),
    ]);

  if (budgetError) throw new Error(budgetError.message);
  if (txError) throw new Error(txError.message);

  return buildBudgetReport({
    fiscal_year: fiscalYear,
    budgets: budgets ?? [],
    transactions: ((transactions ?? []) as Array<{
      category: string | null;
      amount_pence: number;
      date: string;
    }>).map((t): BudgetTransaction => ({
      category: t.category,
      amount_pence: t.amount_pence,
      date: t.date.slice(0, 10),
    })),
  });
}

/**
 * Set the budget for one category in one fiscal year.
 * An amount of zero removes the line rather than storing a zero budget.
 */
export async function setBudgetLine(formData: FormData) {
  const supabase = await createClient();
  const orgId = await requireOrgId(supabase);

  const fiscalYear = Number(formData.get("fiscal_year"));
  const category = (formData.get("category") as string ?? "").trim();
  const amountStr = (formData.get("amount") as string ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!Number.isInteger(fiscalYear)) {
    throw new Error("A fiscal year is required.");
  }
  if (!budgetCategories.has(category)) {
    throw new Error(`Unknown budget category: ${category || "(none)"}`);
  }

  const amountPence = Math.round(parseFloat(amountStr) * 100);
  if (!Number.isFinite(amountPence) || amountPence < 0) {
    throw new Error("Budget amount must be zero or more.");
  }

  if (amountPence === 0) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("org_id", orgId)
      .eq("fiscal_year", fiscalYear)
      .eq("category", category);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("budgets").upsert(
      {
        org_id: orgId,
        fiscal_year: fiscalYear,
        category,
        amount_pence: amountPence,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,fiscal_year,category" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard");
}
