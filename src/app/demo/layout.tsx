import React from "react";
import Link from "next/link";
import DemoSidebar from "@/components/demo/DemoSidebar";
import { DenominationProvider } from "@/contexts/DenominationContext";
import { DemoStateProvider } from "@/contexts/DemoStateContext";
import DemoResetButton from "@/components/demo/DemoResetButton";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DenominationProvider>
      <DemoStateProvider>
        <div id="dashboard" className="screen active" style={{ flexDirection: "row" }}>
          <DemoSidebar />
          <div className="main-area" style={{ position: "relative" }}>
            {/* Demo Banner */}
            <div style={{
              background: "linear-gradient(90deg, var(--forest) 0%, var(--forest2) 100%)",
              color: "#fff",
              padding: "0.6rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.88rem",
              gap: "1rem",
              flexShrink: 0,
            }}>
              <span>
                🎭 <strong>Live Demo Mode</strong> — Browsing Steward with sample data for Grace Baptist Church. No real data stored.
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <DemoResetButton />
                <Link href="/auth" className="btn btn-gold btn-sm" style={{ whiteSpace: "nowrap" }}>
                  Sign up free →
                </Link>
              </div>
            </div>
            {children}
          </div>
        </div>
      </DemoStateProvider>
    </DenominationProvider>
  );
}
