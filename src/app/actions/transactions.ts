"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  org_id: string;
  created_at: string;
};

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("getTransactions error:", error);
    return [];
  }
  return data ?? [];
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

  if (!description || !amountStr || !date) {
    throw new Error("Description, amount and date are required.");
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

  if (!description || !amountStr || !date) {
    throw new Error("Description, amount and date are required.");
  }

  const absAmount = Math.round(parseFloat(amountStr) * 100);
  const amountPence = type === "expense" ? -Math.abs(absAmount) : Math.abs(absAmount);

  const { error } = await supabase
    .from("transactions")
    .update({ description, category, notes, amount_pence: amountPence, date, member_id: memberId })
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

