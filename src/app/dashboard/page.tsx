"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";

export default function DashboardOverview() {
  const { terms } = useDenomination();

  return (
    <>
      <Topbar 
        title="Good morning 👋"
        subtitle={`Grace ${terms.label} Church · April 2026`}
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
            <div className="kpi-lbl">{terms.giving}</div>
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
              <div className="tx">
                <div className="tx-ico inc">🎁</div>
                <div className="tx-body">
                  <div className="tx-name">Sunday offering — 27 Apr</div>
                  <div className="tx-meta">General Fund</div>
                </div>
                <div className="tx-amt inc">+£3,840</div>
                <div className="chip chip-sage">Auto</div>
              </div>
              <div className="tx">
                <div className="tx-ico res">💰</div>
                <div className="tx-body">
                  <div className="tx-name">National Lottery Grant</div>
                  <div className="tx-meta">Restricted · Community outreach</div>
                </div>
                <div className="tx-amt inc">+£5,000</div>
                <div className="chip chip-gold">Restricted</div>
              </div>
              <div className="tx">
                <div className="tx-ico exp">🏢</div>
                <div className="tx-body">
                  <div className="tx-name">Building maintenance</div>
                  <div className="tx-meta">Facilities · April invoice</div>
                </div>
                <div className="tx-amt exp">-£1,200</div>
              </div>
              <div className="tx">
                <div className="tx-ico inc">🎁</div>
                <div className="tx-body">
                  <div className="tx-name">{terms.giving} — April</div>
                  <div className="tx-meta">Standing orders · 48 givers</div>
                </div>
                <div className="tx-amt inc">+£4,800</div>
                <div className="chip chip-sage">Auto</div>
              </div>
              <div className="tx">
                <div className="tx-ico exp">💼</div>
                <div className="tx-body">
                  <div className="tx-name">{terms.minister} payroll — April</div>
                  <div className="tx-meta">Salaries · 2 employees</div>
                </div>
                <div className="tx-amt exp">-£5,400</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Fund allocation</div>
                <div className="card-link">Manage →</div>
              </div>
              <div className="fund-rows">
                <div>
                  <div className="fund-head">
                    <span className="fund-nm">General fund</span>
                    <span className="fund-vl">52%</span>
                  </div>
                  <div className="fund-bar">
                    <div className="fund-fill" style={{ width: "52%", background: "var(--forest)" }}></div>
                  </div>
                </div>
                <div>
                  <div className="fund-head">
                    <span className="fund-nm">Building fund</span>
                    <span className="fund-vl">22%</span>
                  </div>
                  <div className="fund-bar">
                    <div className="fund-fill" style={{ width: "22%", background: "var(--gold)" }}></div>
                  </div>
                </div>
                <div>
                  <div className="fund-head">
                    <span className="fund-nm">Community outreach</span>
                    <span className="fund-vl">15%</span>
                  </div>
                  <div className="fund-bar">
                    <div className="fund-fill" style={{ width: "15%", background: "var(--sage)" }}></div>
                  </div>
                </div>
                <div>
                  <div className="fund-head">
                    <span className="fund-nm">Mission giving</span>
                    <span className="fund-vl">11%</span>
                  </div>
                  <div className="fund-bar">
                    <div className="fund-fill" style={{ width: "11%", background: "var(--stone2)" }}></div>
                  </div>
                </div>
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
                ⚠️ Building fund repair work is scheduled for June. At current expenditure rate, the fund covers the estimated £12,000 cost with £3,200 to spare.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
