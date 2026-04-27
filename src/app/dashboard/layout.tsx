import React from "react";
import { DenominationProvider, type Denomination } from "@/contexts/DenominationContext";
import Sidebar from "@/components/dashboard/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    redirect("/onboarding");
  }

  // Fetch the org's denomination so the whole dashboard uses it from the start
  const { data: org } = await supabase
    .from("organizations")
    .select("denomination")
    .eq("id", profile.org_id)
    .single();

  const denomination = (org?.denomination as Denomination) ?? "independent";

  return (
    <DenominationProvider initialDenomination={denomination}>
      <div id="dashboard" className="screen active" style={{ flexDirection: "row" }}>
        <Sidebar />
        <div className="main-area">
          {children}
        </div>
      </div>
    </DenominationProvider>
  );
}
