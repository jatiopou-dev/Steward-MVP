import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import DonationImportClient from "./DonationImportClient";

export default async function DonationImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) redirect("/onboarding");

  return (
    <>
      <Topbar
        title="Donation imports"
        subtitle="Upload a bank CSV, Stripe export, or The Giving Block settlement"
      />
      <DonationImportClient orgId={membership.organisation_id} />
    </>
  );
}
