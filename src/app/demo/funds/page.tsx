"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
export default function DemoFunds() {
  const funds = [
    { name: "General Fund", balance: "£42,810", pct: 52, color: "var(--forest)", restricted: false, notes: "Day-to-day operations" },
    { name: "Building Fund", balance: "£18,200", pct: 22, color: "var(--gold)", restricted: false, notes: "June renovation target: £12,000" },
    { name: "Community Outreach", balance: "£12,300", pct: 15, color: "var(--sage)", restricted: true, notes: "National Lottery — restricted" },
    { name: "Mission Giving", balance: "£9,050", pct: 11, color: "var(--stone2)", restricted: false, notes: "Partnership with 3 overseas missions" },
  ];
  return (
    <>
      <Topbar title="Fund Accounts" subtitle="Restricted, unrestricted & designated funds" actions={<button className="btn btn-forest btn-sm">+ New Fund</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total assets</div><div className="kpi-val">£82,360</div><div className="kpi-meta up">↑ £5,340 this month</div></div>
          <div className="kpi"><div className="kpi-lbl">Restricted funds</div><div className="kpi-val">£12,300</div><div className="kpi-meta neutral">1 fund</div></div>
          <div className="kpi"><div className="kpi-lbl">Unrestricted</div><div className="kpi-val">£70,060</div><div className="kpi-meta up">Freely available</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Fund breakdown</div></div>
          <div className="fund-rows" style={{ padding: "0.5rem 0" }}>
            {funds.map((f) => (
              <div key={f.name} style={{ padding: "1rem 0", borderBottom: "1px solid var(--border)" }}>
                <div className="fund-head" style={{ marginBottom: "0.5rem" }}>
                  <span className="fund-nm" style={{ fontWeight: 600 }}>{f.name} {f.restricted && <span className="chip chip-gold" style={{ marginLeft: 8, fontSize: "0.75rem" }}>Restricted</span>}</span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{f.balance}</span>
                </div>
                <div className="fund-bar"><div className="fund-fill" style={{ width: `${f.pct}%`, background: f.color }}></div></div>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: "0.35rem" }}>{f.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
