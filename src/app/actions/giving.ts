"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateClaimableGiftAid,
  generateHmrcCsv,
  mapToGiftAidTransactions,
  type GiftAidSourceTransaction,
} from "@/utils/giftAid";

export type GivingMember = {
  id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  is_gift_aid_eligible: boolean;
};

type MemberName = {
  title?: string | null;
  first_name: string;
  last_name: string;
};

export type GivingTransaction = {
  id: string;
  description: string;
  category: string | null;
  amount_pence: number;
  date: string;
  is_gift_aid_claimed: boolean;
  member_id: string | null;
  members: {
    title: string | null;
    first_name: string;
    last_name: string;
    address_line1: string | null;
    postcode: string | null;
    is_gift_aid_eligible: boolean;
  } | null;
};

function memberDisplayName(member: MemberName | null) {
  if (!member) return "Anonymous / unlinked";
  return [member.title, member.first_name, member.last_name].filter(Boolean).join(" ");
}

export async function getGivingMembers(): Promise<GivingMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, title, first_name, last_name, is_gift_aid_eligible")
    .order("last_name", { ascending: true });

  if (error) {
    console.error("getGivingMembers error:", error);
    return [];
  }

  return data ?? [];
}

export async function getGivingTransactions(): Promise<GivingTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      description,
      category,
      amount_pence,
      date,
      is_gift_aid_claimed,
      member_id,
      members (
        title,
        first_name,
        last_name,
        address_line1,
        postcode,
        is_gift_aid_eligible
      )
    `)
    .gt("amount_pence", 0)
    .order("date", { ascending: false });

  if (error) {
    console.error("getGivingTransactions error:", error);
    return [];
  }

  return ((data ?? []) as unknown as Array<
    Omit<GivingTransaction, "members"> & {
      members: GivingTransaction["members"] | GivingTransaction["members"][];
    }
  >).map((row) => ({
    ...row,
    members: Array.isArray(row.members) ? row.members[0] ?? null : row.members,
  }));
}

export async function getGiftAidExport() {
  const transactions = await getGivingTransactions();
  const mapped = mapToGiftAidTransactions(transactions as GiftAidSourceTransaction[]);

  return {
    csv: generateHmrcCsv(mapped),
    claimablePence: calculateClaimableGiftAid(mapped),
    claimableCount: mapped.filter(
      (tx) => tx.member.isGiftAidEligible && !tx.isGiftAidClaimed
    ).length,
  };
}

export async function createGivingRecord(formData: FormData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (profileError || !profile?.org_id) {
    throw new Error("Could not find your organisation.");
  }

  const amountStr = formData.get("amount") as string;
  const amountPence = Math.round(parseFloat(amountStr) * 100);
  const date = formData.get("date") as string;
  const memberId = (formData.get("member_id") as string) || null;
  const category = (formData.get("category") as string) || "Regular giving";
  const notes = (formData.get("notes") as string).trim() || null;
  const descriptionInput = (formData.get("description") as string).trim();

  if (!amountStr || !date || isNaN(amountPence) || amountPence <= 0) {
    throw new Error("Amount and date are required.");
  }

  let description = descriptionInput;
  if (!description && memberId) {
    const { data: member } = await supabase
      .from("members")
      .select("title, first_name, last_name")
      .eq("id", memberId)
      .single();

    description = `${memberDisplayName(member)} giving`;
  }
  if (!description) description = "Anonymous giving";

  const { error } = await supabase.from("transactions").insert({
    org_id: profile.org_id,
    member_id: memberId,
    description,
    category,
    notes,
    amount_pence: Math.abs(amountPence),
    date,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/giving");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  redirect("/dashboard/giving");
}

