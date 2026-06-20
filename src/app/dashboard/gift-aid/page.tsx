import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import GiftAidClient from "./GiftAidClient";
import { listDeclarations } from "@/app/actions/v2/giftAid";
import type { GiftAidClaim } from "@/lib/types/v2";

export default async function GiftAidPage() {
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

  const orgId = membership.organisation_id;

  const [declarationsResult, claimsResult, donorsResult] = await Promise.all([
    listDeclarations({ organisation_id: orgId }),
    supabase
      .from("gift_aid_claims")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("donors")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("gift_aid_eligible", true)
      .eq("status", "active"),
  ]);

  const declarations = "data" in declarationsResult ? (declarationsResult.data ?? []) : [];
  const claims = (claimsResult.data ?? []) as GiftAidClaim[];
  const eligibleDonorCount = donorsResult.count ?? 0;

  return (
    <>
      <Topbar
        title="Gift Aid"
        subtitle="Manage donor declarations and submit HMRC claims"
      />
      <GiftAidClient
        orgId={orgId}
        initialDeclarations={declarations}
        initialClaims={claims}
        eligibleDonorCount={eligibleDonorCount}
      />
    </>
  );
}
