"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function TransactionsPage() {
  return (
    <>
      <Topbar 
        title="Transactions"
        subtitle="All income and expenditure · AI-categorised"
        actions={
          <>
            <button className="btn btn-outline btn-sm">⬇ Import CSV</button>
            <button className="btn btn-forest btn-sm">+ Add</button>
          </>
        }
      />
      <div className="content">
        <div className="card">
          <div className="tx-list">
            <div className="tx"><div className="tx-ico inc">🎁</div><div className="tx-body"><div className="tx-name">Sunday offering — 27 Apr</div><div className="tx-meta">General Fund · Plate offering</div></div><div className="tx-amt inc">+£3,840</div><div className="chip chip-sage">AI categorised</div></div>
            <div className="tx"><div className="tx-ico res">💰</div><div className="tx-body"><div className="tx-name">National Lottery Community Fund</div><div className="tx-meta">Restricted · Community outreach fund</div></div><div className="tx-amt inc">+£5,000</div><div className="chip chip-gold">Restricted</div></div>
            <div className="tx"><div className="tx-ico exp">🏢</div><div className="tx-body"><div className="tx-name">Building maintenance — Apex Ltd</div><div className="tx-meta">Facilities</div></div><div className="tx-amt exp">-£1,200</div></div>
            <div className="tx"><div className="tx-ico inc">🎁</div><div className="tx-body"><div className="tx-name">Covenanted giving — April batch</div><div className="tx-meta">General Fund · 48 standing orders</div></div><div className="tx-amt inc">+£4,800</div><div className="chip chip-sage">Auto</div></div>
            <div className="tx"><div className="tx-ico exp">💼</div><div className="tx-body"><div className="tx-name">Minister payroll — April</div><div className="tx-meta">Salaries</div></div><div className="tx-amt exp">-£5,400</div></div>
            <div className="tx"><div className="tx-ico inc">🎁</div><div className="tx-body"><div className="tx-name">Gift Day — Easter appeal</div><div className="tx-meta">Building fund · One-off gifts</div></div><div className="tx-amt inc">+£2,840</div><div className="chip chip-sage">AI categorised</div></div>
            <div className="tx"><div className="tx-ico exp">🎵</div><div className="tx-body"><div className="tx-name">Music equipment — worship team</div><div className="tx-meta">Ministry · Capital purchase</div></div><div className="tx-amt exp">-£680</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
