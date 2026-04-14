import React from "react";
import Link from "next/link";
import DemoSidebar from "@/components/demo/DemoSidebar";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="dashboard" className="screen active" style={{ flexDirection: "row" }}>
      <DemoSidebar />
      <div className="main-area" style={{ position: "relative" }}>
        {/* Demo Banner */}
        <div style={{
          background: "linear-gradient(90deg, var(--forest) 0%, #2d6a4f 100%)",
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
            🎭 <strong>Live Demo Mode</strong> — You're browsing Steward with sample data for Grace Baptist Church. No real data is stored.
          </span>
          <Link href="/auth" className="btn btn-gold btn-sm" style={{ whiteSpace: "nowrap" }}>
            Sign up free →
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
