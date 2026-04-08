"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function FundsPage() {
  return (
    <>
      <Topbar 
        title="Fund accounts"
        subtitle="Restricted, unrestricted and designated funds"
        actions={<button className="btn btn-forest btn-sm">+ New fund</button>}
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">General fund</div><div className="kpi-val">£28,400</div><div className="kpi-meta neutral">Unrestricted</div></div>
          <div className="kpi"><div className="kpi-lbl">Building fund</div><div className="kpi-val">£15,200</div><div className="kpi-meta neutral">Designated</div></div>
          <div className="kpi"><div className="kpi-lbl">Community outreach</div><div className="kpi-val">£6,840</div><div className="kpi-meta" style={{color:"var(--gold)"}}>Restricted · 32% used</div></div>
          <div className="kpi"><div className="kpi-lbl">Mission giving</div><div className="kpi-val">£3,200</div><div className="kpi-meta neutral">Designated</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">All fund balances</div><div className="card-link">Export →</div></div>
          <table className="tbl">
            <thead><tr><th>Fund name</th><th>Type</th><th>Balance</th><th>% of total</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>General fund</td><td><div className="chip chip-stone">Unrestricted</div></td><td><strong>£28,400</strong></td><td>52%</td><td><div className="chip chip-sage">Active</div></td></tr>
              <tr><td>Building fund</td><td><div className="chip chip-stone">Designated</div></td><td><strong>£15,200</strong></td><td>28%</td><td><div className="chip chip-sage">Active</div></td></tr>
              <tr><td>Community outreach (Lottery)</td><td><div className="chip chip-gold">Restricted</div></td><td><strong>£6,840</strong></td><td>12%</td><td><div className="chip chip-sage">Active</div></td></tr>
              <tr><td>Mission giving</td><td><div className="chip chip-stone">Designated</div></td><td><strong>£3,200</strong></td><td>6%</td><td><div className="chip chip-sage">Active</div></td></tr>
              <tr><td>Youth work bursary</td><td><div className="chip chip-gold">Restricted</div></td><td><strong>£1,600</strong></td><td>3%</td><td><div className="chip chip-gold">Monitor</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
