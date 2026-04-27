"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type Member = {
  id: string;
  org_id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  postcode: string | null;
  status: string;
  joined_date: string | null;
  baptism_date: string | null;
  is_gift_aid_eligible: boolean;
  gift_aid_declaration_date: string | null;
  notes: string | null;
  created_at: string;
};

export type MemberStatus =
  | "active"
  | "inactive"
  | "transfer_in"
  | "transfer_out"
  | "deceased";

export async function getMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    console.error("getMembers error:", error);
    return [];
  }
  return data ?? [];
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createMember(formData: FormData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (profileError || !profile?.org_id) {
    throw new Error("Could not find your organisation. Please re-login.");
  }

  const first_name = (formData.get("first_name") as string).trim();
  const last_name = (formData.get("last_name") as string).trim();

  if (!first_name || !last_name) {
    throw new Error("First name and last name are required.");
  }

  const { error } = await supabase.from("members").insert({
    org_id: profile.org_id,
    title: (formData.get("title") as string) || null,
    first_name,
    last_name,
    email: (formData.get("email") as string).trim() || null,
    phone: (formData.get("phone") as string).trim() || null,
    address_line1: (formData.get("address_line1") as string).trim() || null,
    postcode: (formData.get("postcode") as string).trim().toUpperCase() || null,
    status: (formData.get("status") as string) || "active",
    joined_date: (formData.get("joined_date") as string) || null,
    baptism_date: (formData.get("baptism_date") as string) || null,
    is_gift_aid_eligible: formData.get("is_gift_aid_eligible") === "true",
    gift_aid_declaration_date:
      (formData.get("gift_aid_declaration_date") as string) || null,
    notes: (formData.get("notes") as string).trim() || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}

export async function updateMember(id: string, formData: FormData) {
  const supabase = await createClient();

  const first_name = (formData.get("first_name") as string).trim();
  const last_name = (formData.get("last_name") as string).trim();

  if (!first_name || !last_name) {
    throw new Error("First name and last name are required.");
  }

  const { error } = await supabase
    .from("members")
    .update({
      title: (formData.get("title") as string) || null,
      first_name,
      last_name,
      email: (formData.get("email") as string).trim() || null,
      phone: (formData.get("phone") as string).trim() || null,
      address_line1: (formData.get("address_line1") as string).trim() || null,
      postcode:
        (formData.get("postcode") as string).trim().toUpperCase() || null,
      status: (formData.get("status") as string) || "active",
      joined_date: (formData.get("joined_date") as string) || null,
      baptism_date: (formData.get("baptism_date") as string) || null,
      is_gift_aid_eligible: formData.get("is_gift_aid_eligible") === "true",
      gift_aid_declaration_date:
        (formData.get("gift_aid_declaration_date") as string) || null,
      notes: (formData.get("notes") as string).trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}

export async function deleteMember(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing member id");

  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/members");
}

export const MEMBER_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Rev", "Prof"];

export const MEMBER_STATUSES: { value: MemberStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transfer_in", label: "Transfer in" },
  { value: "transfer_out", label: "Transfer out" },
  { value: "deceased", label: "Deceased" },
];
