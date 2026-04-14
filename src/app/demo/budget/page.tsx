"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
export default function DemoBudget() {
  const lines = [
    { cat: "Pastoral salaries", budget: 46800, actual: 15200, period: "Q1" },
    { cat: "Facilities & maintenance", budget: 12000, actual: 4840, period: "Q1" },
    { cat: "Missions & outreach", budget: 8400, actual: 2100, period: "Q1" },
    { cat: "Ministry & programs", budget: 6000, actual: 1380, period: "Q1" },
    { cat: "Administration", budget: 3600, actual: 890, period: "Q1" },
  ];
  return (
    <>
      <Topbar title="Budget Tracker" subtitle="Annual budget vs actual spending · 2025–26" actions={<button className="btn btn-forest btn-sm">Edit budget</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Annual budget</div><div className="kpi-val">£76,800</div><div className="kpi-meta neutral">FY 2025/26</div></div>
          <div className="kpi"><div className="kpi-lbl">Spent (Q1)</div><div className="kpi-val">£24,410</div><div className="kpi-meta neutral">32% of annual</div></div>
          <div className="kpi"><div className="kpi-lbl">Remaining</div><div className="kpi-val">£52,390</div><div className="kpi-meta up">On track</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Budget vs Actual — Q1 2026</div></div>
          <table className="tbl">
            <thead><tr><th>Category</th><th>Annual Budget</th><th>Q1 Actual</th><th>% Used</th><th>Status</th></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const pct = Math.round((l.actual / (l.budget / 4)) * 100);
                const ok = pct <= 110;
                return (
                  <tr key={i}>
                    <td><strong>{l.cat}</strong></td>
                    <td>£{l.budget.toLocaleString()}</td>
                    <td>£{l.actual.toLocaleString()}</td>
                    <td>{pct}% of Q1 target</td>
                    <td><div className={`chip ${ok ? "chip-sage" : "chip-gold"}`}>{ok ? "On track" : "Over budget"}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
