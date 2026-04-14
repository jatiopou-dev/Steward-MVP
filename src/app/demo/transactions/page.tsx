"use client";
import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";

const txData = [
  { ico: "inc", emoji: "🎁", name: "Sunday offering — 27 Apr", meta: "General Fund · Plate offering", amt: "+£3,840", chip: "AI categorised", chipCls: "chip-sage" },
  { ico: "res", emoji: "💰", name: "National Lottery Community Fund", meta: "Restricted · Community outreach fund", amt: "+£5,000", chip: "Restricted", chipCls: "chip-gold" },
  { ico: "exp", emoji: "🏢", name: "Building maintenance — Apex Ltd", meta: "Facilities", amt: "-£1,200", chip: "", chipCls: "" },
  { ico: "inc", emoji: "🎁", name: "Covenanted giving — April batch", meta: "General Fund · 48 standing orders", amt: "+£4,800", chip: "Auto", chipCls: "chip-sage" },
  { ico: "exp", emoji: "💼", name: "Pastor payroll — April", meta: "Salaries", amt: "-£5,400", chip: "", chipCls: "" },
  { ico: "inc", emoji: "🎁", name: "Gift Day — Easter appeal", meta: "Building fund · One-off gifts", amt: "+£2,840", chip: "AI categorised", chipCls: "chip-sage" },
  { ico: "exp", emoji: "🎵", name: "Music equipment — worship team", meta: "Ministry · Capital purchase", amt: "-£680", chip: "", chipCls: "" },
];

export default function DemoTransactions() {
  return (
    <>
      <Topbar
        title="Transactions"
        subtitle="All income and expenditure · AI-categorised"
        actions={
          <>
            <Link href="/demo/transactions/import" className="btn btn-outline btn-sm">⬇ Import CSV</Link>
            <button className="btn btn-forest btn-sm">+ Add</button>
          </>
        }
      />
      <div className="content">
        <div className="card">
          <div className="tx-list">
            {txData.map((tx, i) => (
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
      </div>
    </>
  );
}
