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
            {/* Standing notice, not a card: it states what this
                environment is and offers the way out of it. Stacks at
                narrow widths so the sentence never becomes a column. */}
            <div className="demo-banner">
              <p className="demo-banner-text">
                <strong>Live demo</strong> — sample data for Grace Baptist
                Church. Nothing you do here is saved.
              </p>
              <div className="demo-banner-actions">
                <DemoResetButton />
                <Link href="/auth" className="btn btn-forest btn-sm">
                  Sign up free
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
