import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import { type Denomination } from "@/contexts/DenominationContext";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("org_id").single();
  const orgId = profile?.org_id as string | undefined;

  let denomination: Denomination = "independent";
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("denomination")
      .eq("id", orgId)
      .single();
    denomination = ((org as { denomination?: string } | null)?.denomination ?? "independent") as Denomination;
  }

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Denomination, terminology, and billing"
      />
      <SettingsClient initialDenomination={denomination} />
    </>
  );
}
