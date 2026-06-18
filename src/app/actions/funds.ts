"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type Fund = {
  id: string;
  org_id: string;
  name: string;
  type: FundType;
  balance_pence: number;
  opening_balance_pence: number;
  description: string | null;
  status: FundStatus;
  created_at: string;
};

export type FundType = "unrestricted" | "restricted" | "designated";
export type FundStatus = "active" | "monitor" | "closed";
export type FundOption = Pick<Fund, "id" | "name" | "type" | "status">;

export async function getFunds(): Promise<Fund[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .order("balance_pence", { ascending: false });

  if (error) {
    console.error("getFunds error:", error);
    return [];
  }
  return data ?? [];
}

export async function getFundOptions(): Promise<FundOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funds")
    .select("id, name, type, status")
    .neq("status", "closed")
    .order("name", { ascending: true });

  if (error) {
    console.error("getFundOptions error:", error);
    return [];
  }

  return data ?? [];
}

export async function getFund(id: string): Promise<Fund | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

export async function createFund(formData: FormData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (profileError || !profile?.org_id) {
    throw new Error("Could not find your organisation.");
  }

  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Fund name is required.");

  const balanceStr = (formData.get("balance") as string) || "0";
  const balancePence = Math.round(parseFloat(balanceStr) * 100);

  const { error } = await supabase.from("funds").insert({
    org_id: profile.org_id,
    name,
    type: (formData.get("type") as FundType) || "unrestricted",
    balance_pence: isNaN(balancePence) ? 0 : balancePence,
    opening_balance_pence: isNaN(balancePence) ? 0 : balancePence,
    description: (formData.get("description") as string).trim() || null,
    status: (formData.get("status") as FundStatus) || "active",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/funds");
  revalidatePath("/dashboard");
  redirect("/dashboard/funds");
}

export async function updateFund(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Fund name is required.");

  const balanceStr = (formData.get("balance") as string) || "0";
  const openingBalancePence = Math.round(parseFloat(balanceStr) * 100);

  const { data: existing, error: existingError } = await supabase
    .from("funds")
    .select("balance_pence, opening_balance_pence")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message || "Could not find fund.");
  }

  const nextOpeningBalance = isNaN(openingBalancePence) ? 0 : openingBalancePence;
  const currentOpeningBalance = existing.opening_balance_pence ?? existing.balance_pence;
  const nextCurrentBalance = existing.balance_pence + nextOpeningBalance - currentOpeningBalance;

  const { error } = await supabase
    .from("funds")
    .update({
      name,
      type: (formData.get("type") as FundType) || "unrestricted",
      balance_pence: nextCurrentBalance,
      opening_balance_pence: nextOpeningBalance,
      description: (formData.get("description") as string).trim() || null,
      status: (formData.get("status") as FundStatus) || "active",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/funds");
  revalidatePath("/dashboard");
  redirect("/dashboard/funds");
}

export async function deleteFund(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing fund id");

  const supabase = await createClient();
  const { error } = await supabase.from("funds").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/funds");
  revalidatePath("/dashboard");
}
