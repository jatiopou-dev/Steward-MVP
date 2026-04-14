import React from "react";
import { DenominationProvider } from "@/contexts/DenominationContext";
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
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    redirect("/onboarding");
  }

  return (
    <DenominationProvider>
      <div id="dashboard" className="screen active" style={{ flexDirection: "row" }}>
        <Sidebar />
        <div className="main-area">
          {children}
        </div>
      </div>
    </DenominationProvider>
  );
}
