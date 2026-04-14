"use client";
import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
export default function DemoSettings() {
  return (
    <>
      <Topbar title="Settings" subtitle="Denomination engine — Grace Baptist Church" />
      <div className="content">
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-head"><div className="card-title">Denomination Engine</div></div>
          <p className="card-sub" style={{ marginBottom: "1.5rem" }}>In the demo, terminology is set to <strong>Baptist</strong>. Sign up to configure your own denomination.</p>
          <div className="setting-row"><div><div className="setting-label">Primary giving terminology</div><div className="setting-desc">Used on dashboards and donor reports.</div></div><strong>Covenanted Giving</strong></div>
          <div className="setting-row"><div><div className="setting-label">Minister / Leader title</div><div className="setting-desc">Used for payroll and staffing labels.</div></div><strong>Pastor</strong></div>
          <div className="setting-row"><div><div className="setting-label">Governance body</div><div className="setting-desc">The primary team overseeing the church.</div></div><strong>Diaconate</strong></div>
          <div className="setting-row"><div><div className="setting-label">Oversight tier</div><div className="setting-desc">Your regional or governing authority level.</div></div><strong>Association</strong></div>
        </div>

        <div className="ai-card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
            <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>Unlock Full Access</div>
            <div className="ai-badge">✨ Sign up free</div>
          </div>
          <div className="ai-insight">🔓 Sign up to configure your denomination, invite team members, connect your bank, and start your 14-day free trial.</div>
          <Link href="/auth" className="btn btn-gold btn-sm" style={{ marginTop: "1rem", display: "inline-block" }}>Create your account →</Link>
        </div>
      </div>
    </>
  );
}
