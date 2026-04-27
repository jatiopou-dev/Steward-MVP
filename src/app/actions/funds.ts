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
  description: string | null;
  status: FundStatus;
  created_at: string;
};

export type FundType = "unrestricted" | "restricted" | "designated";
export type FundStatus = "active" | "monitor" | "closed";

export const FUND_TYPES: { value: FundType; label: string; chip: string }[] = [
  { value: "unrestricted", label: "Unrestricted", chip: "chip-stone" },
  { value: "designated",   label: "Designated",   chip: "chip-stone" },
  { value: "restricted",   label: "Restricted",   chip: "chip-gold"  },
];

export const FUND_STATUSES: { value: FundStatus; label: string; chip: string }[] = [
  { value: "active",  label: "Active",  chip: "chip-sage" },
  { value: "monitor", label: "Monitor", chip: "chip-gold" },
  { value: "closed",  label: "Closed",  chip: "chip-stone" },
];

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
  const balancePence = Math.round(parseFloat(balanceStr) * 100);

  const { error } = await supabase
    .from("funds")
    .update({
      name,
      type: (formData.get("type") as FundType) || "unrestricted",
      balance_pence: isNaN(balancePence) ? 0 : balancePence,
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
