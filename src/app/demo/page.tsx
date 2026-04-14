"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function DemoOverview() {
  return (
    <>
      <Topbar
        title="Good morning 👋"
        subtitle="Grace Baptist Church · April 2026"
        actions={
          <>
            <button className="btn btn-outline btn-sm">Generate report</button>
            <button className="btn btn-forest btn-sm">+ Transaction</button>
          </>
        }
      />

      <div className="content">
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Total income (Apr)</div>
            <div className="kpi-val">£14,280</div>
            <div className="kpi-meta up">↑ 11.2% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total expenditure</div>
            <div className="kpi-val">£8,940</div>
            <div className="kpi-meta down">↑ 4.8% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Net surplus</div>
            <div className="kpi-val">£5,340</div>
            <div className="kpi-meta up">↑ 22% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Covenanted Giving</div>
            <div className="kpi-val">£4,800</div>
            <div className="kpi-meta neutral">48 active givers</div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Recent transactions</div>
                <div className="card-sub">AI-categorised · this month</div>
              </div>
              <div className="card-link">View all →</div>
            </div>
            <div className="tx-list">
              {[
                { ico: "inc", emoji: "🎁", name: "Sunday offering — 27 Apr", meta: "General Fund", amt: "+£3,840", chip: "Auto", chipCls: "chip-sage" },
                { ico: "res", emoji: "💰", name: "National Lottery Grant", meta: "Restricted · Community outreach", amt: "+£5,000", chip: "Restricted", chipCls: "chip-gold" },
                { ico: "exp", emoji: "🏢", name: "Building maintenance", meta: "Facilities · April invoice", amt: "-£1,200", chip: "", chipCls: "" },
                { ico: "inc", emoji: "🎁", name: "Covenanted giving — April", meta: "Standing orders · 48 givers", amt: "+£4,800", chip: "Auto", chipCls: "chip-sage" },
                { ico: "exp", emoji: "💼", name: "Pastor payroll — April", meta: "Salaries · 2 employees", amt: "-£5,400", chip: "", chipCls: "" },
              ].map((tx, i) => (
                <div className="tx" key={i}>
                  <div className={`tx-ico ${tx.ico}`}>{tx.emoji}</div>
                  <div className="tx-body">
                    <div className="tx-name">{tx.name}</div>
                    <div className="tx-meta">{tx.meta}</div>
                  </div>
                  <div className={`tx-amt ${tx.ico}`}>{tx.amt}</div>
                  {tx.chip && <div className={`chip ${tx.chipCls}`}>{tx.chip}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Fund allocation</div>
                <div className="card-link">Manage →</div>
              </div>
              <div className="fund-rows">
                {[
                  { name: "General fund", pct: 52, color: "var(--forest)" },
                  { name: "Building fund", pct: 22, color: "var(--gold)" },
                  { name: "Community outreach", pct: 15, color: "var(--sage)" },
                  { name: "Mission giving", pct: 11, color: "var(--stone2)" },
                ].map((f) => (
                  <div key={f.name}>
                    <div className="fund-head">
                      <span className="fund-nm">{f.name}</span>
                      <span className="fund-vl">{f.pct}%</span>
                    </div>
                    <div className="fund-bar">
                      <div className="fund-fill" style={{ width: `${f.pct}%`, background: f.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
                <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>AI insights</div>
                <div className="ai-badge">✨ Live</div>
              </div>
              <div className="ai-insight">
                📈 Giving is 11% ahead of last April. At this rate you will exceed your annual income target by approximately{" "}
                <strong style={{ color: "var(--gold3)" }}>£8,400</strong>.
              </div>
              <div className="ai-insight">
                ⚠️ Building fund repair work is scheduled for June. At current rate, the fund covers the estimated £12,000 cost with £3,200 to spare.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
