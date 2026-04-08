import React from "react";
import { DenominationProvider } from "@/contexts/DenominationContext";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
