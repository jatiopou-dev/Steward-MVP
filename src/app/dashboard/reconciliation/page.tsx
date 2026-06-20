import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import ReconciliationClient from "./ReconciliationClient";
import { listPeriods } from "@/app/actions/v2/reconciliation";

export default async function ReconciliationPage() {
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

  const periodsResult = await listPeriods(membership.organisation_id);
  const periods = "data" in periodsResult ? (periodsResult.data ?? []) : [];

  return (
    <>
      <Topbar
        title="Reconciliation"
        subtitle="Close periods to lock donations and anchor to the blockchain"
      />
      <ReconciliationClient orgId={membership.organisation_id} initialPeriods={periods} />
    </>
  );
}
