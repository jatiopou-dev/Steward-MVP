"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/utils/domainOptions";

const transactionCategories = new Set<string>([
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
]);

export type Transaction = {
  id: string;
  description: string;
  category: string | null;
  notes: string | null;
  amount_pence: number;
  date: string;
  is_gift_aid_claimed: boolean;
  profile_id: string | null;
  member_id: string | null;
  fund_id: string | null;
  funds: { name: string } | null;
  org_id: string;
  created_at: string;
};

export type ImportTransactionInput = {
  description: string;
  category: string | null;
  amount_pence: number;
  date: string;
  fund_id: string;
  notes?: string | null;
};

export type ImportTransactionsResult = {
  imported: number;
  duplicates: number;
};

function transactionFingerprint(transaction: {
  description: string;
  amount_pence: number;
  date: string;
}): string {
  return [
    transaction.date.slice(0, 10),
    transaction.amount_pence,
    transaction.description.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " "),
  ].join("|");
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, funds(name)")
    .order("date", { ascending: false });

  if (error) {
    console.error("getTransactions error:", error);
    return [];
  }
  return ((data ?? []) as unknown as Array<
    Omit<Transaction, "funds"> & { funds: Transaction["funds"] | Transaction["funds"][] }
  >).map((transaction) => ({
    ...transaction,
    funds: Array.isArray(transaction.funds) ? transaction.funds[0] ?? null : transaction.funds,
  }));
}

export async function importTransactions(
  transactions: ImportTransactionInput[],
): Promise<ImportTransactionsResult> {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error("Choose at least one valid transaction to import.");
  }

  if (transactions.length > 500) {
    throw new Error("Import batches are limited to 500 transactions.");
  }

  const validated = transactions.map((transaction) => {
    const description = transaction.description?.trim();
    const amountPence = Number(transaction.amount_pence);
    const date = transaction.date?.slice(0, 10);
    const fundId = transaction.fund_id?.trim();

    if (!description || !date || !fundId || !Number.isInteger(amountPence) || amountPence === 0) {
      throw new Error("Every imported transaction needs a fund, description, date, and non-zero amount.");
    }

    if (Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      throw new Error(`Invalid transaction date: ${date}`);
    }

    return {
      description,
      amount_pence: amountPence,
      date,
      fund_id: fundId,
      category: transaction.category && transactionCategories.has(transaction.category)
        ? transaction.category
        : null,
      notes: transaction.notes?.trim() || "Imported from bank CSV",
    };
  });

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (profileError || !profile?.org_id) {
    throw new Error("Could not find your organisation. Please re-login.");
  }

  const dates = validated.map((transaction) => transaction.date).sort();
  const dayAfterLastDate = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  dayAfterLastDate.setUTCDate(dayAfterLastDate.getUTCDate() + 1);
  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("description, amount_pence, date")
    .gte("date", dates[0])
    .lt("date", dayAfterLastDate.toISOString());

  if (existingError) {
    throw new Error(existingError.message);
  }

  const fingerprints = new Set(
    (existing ?? []).map((transaction) => transactionFingerprint(transaction)),
  );
  const uniqueTransactions = validated.filter((transaction) => {
    const fingerprint = transactionFingerprint(transaction);
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  });

  if (uniqueTransactions.length > 0) {
    const { error: insertError } = await supabase.from("transactions").insert(
      uniqueTransactions.map((transaction) => ({
        ...transaction,
        org_id: profile.org_id,
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");

  return {
    imported: uniqueTransactions.length,
    duplicates: validated.length - uniqueTransactions.length,
  };
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (profileError || !profile?.org_id) {
    throw new Error("Could not find your organisation. Please re-login.");
  }

  const description = (formData.get("description") as string).trim();
  const amountStr = formData.get("amount") as string;
  const type = formData.get("type") as string; // "income" | "expense"
  const category = (formData.get("category") as string) || null;
  const date = formData.get("date") as string;
  const notes = (formData.get("notes") as string).trim() || null;
  const memberId = (formData.get("member_id") as string) || null;
  const fundId = (formData.get("fund_id") as string) || null;

  if (!description || !amountStr || !date || !fundId) {
    throw new Error("Description, amount, date and fund are required.");
  }

  const absAmount = Math.round(parseFloat(amountStr) * 100);
  const amountPence = type === "expense" ? -Math.abs(absAmount) : Math.abs(absAmount);

  const { error } = await supabase.from("transactions").insert({
    org_id: profile.org_id,
    description,
    category,
    notes,
    amount_pence: amountPence,
    date,
    member_id: memberId,
    fund_id: fundId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  redirect("/dashboard/transactions");
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();

  const description = (formData.get("description") as string).trim();
  const amountStr = formData.get("amount") as string;
  const type = formData.get("type") as string;
  const category = (formData.get("category") as string) || null;
  const date = formData.get("date") as string;
  const notes = (formData.get("notes") as string).trim() || null;
  const memberId = (formData.get("member_id") as string) || null;
  const fundId = (formData.get("fund_id") as string) || null;

  if (!description || !amountStr || !date || !fundId) {
    throw new Error("Description, amount, date and fund are required.");
  }

  const absAmount = Math.round(parseFloat(amountStr) * 100);
  const amountPence = type === "expense" ? -Math.abs(absAmount) : Math.abs(absAmount);

  const { error } = await supabase
    .from("transactions")
    .update({ description, category, notes, amount_pence: amountPence, date, member_id: memberId, fund_id: fundId })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  redirect("/dashboard/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing transaction id");

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
}
