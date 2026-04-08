"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";

export default function GivingPage() {
  const { terms } = useDenomination();

  return (
    <>
      <Topbar 
        title={terms.giving}
        subtitle="Regular givers · Gift Aid eligible"
        actions={<button className="btn btn-forest btn-sm">+ Add giver</button>}
      />
      <div className="content">
        <div className="kpi-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="kpi"><div className="kpi-lbl">Active regular givers</div><div className="kpi-val">48</div><div className="kpi-meta up">↑ 4 this quarter</div></div>
          <div className="kpi"><div className="kpi-lbl">Monthly giving total</div><div className="kpi-val">£4,800</div><div className="kpi-meta up">↑ 8% vs last year</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid claimable (YTD)</div><div className="kpi-val">£3,120</div><div className="kpi-meta up">Ready to claim</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Regular givers</div><div className="card-link">Gift Aid claim →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>Gift Aid</th><th>Since</th></tr></thead>
            <tbody>
              <tr><td>Mr & Mrs Anderson</td><td>Monthly</td><td>£200</td><td><div className="chip chip-sage">Eligible</div></td><td>2018</td></tr>
              <tr><td>Dr Patricia Moore</td><td>Monthly</td><td>£150</td><td><div className="chip chip-sage">Eligible</div></td><td>2021</td></tr>
              <tr><td>Anonymous</td><td>Monthly</td><td>£500</td><td><div className="chip chip-stone">Not declared</div></td><td>2020</td></tr>
              <tr><td>Rev. J. Clarke (retired)</td><td>Monthly</td><td>£120</td><td><div className="chip chip-sage">Eligible</div></td><td>2015</td></tr>
              <tr><td>Youth group fundraiser</td><td>One-off</td><td>£840</td><td><div className="chip chip-stone">N/A</div></td><td>Apr 2026</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
