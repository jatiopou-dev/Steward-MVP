"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function DemoMembers() {
  const members = [
    { initials: "SA", name: "Sarah Anderson", bg: "var(--sage-bg)", color: "var(--sage)", status: "Active", statusCls: "chip-sage", since: 2014, giving: "£2,400", giftAid: "Eligible", giftAidCls: "chip-sage" },
    { initials: "JO", name: "James Okafor", bg: "var(--gold-bg)", color: "var(--gold)", status: "Active", statusCls: "chip-sage", since: 2019, giving: "£1,800", giftAid: "Not declared", giftAidCls: "chip-stone" },
    { initials: "PM", name: "Patricia Moore", bg: "var(--rust-bg)", color: "var(--rust)", status: "Active", statusCls: "chip-sage", since: 2021, giving: "£1,800", giftAid: "Eligible", giftAidCls: "chip-sage" },
    { initials: "DW", name: "David Wilson", bg: "var(--sage-bg)", color: "var(--forest)", status: "Transfer pending", statusCls: "chip-gold", since: 2016, giving: "£640", giftAid: "Eligible", giftAidCls: "chip-sage" },
    { initials: "RB", name: "Rachel Brooks", bg: "var(--gold-bg)", color: "var(--gold)", status: "Active", statusCls: "chip-sage", since: 2020, giving: "£1,200", giftAid: "Eligible", giftAidCls: "chip-sage" },
  ];

  return (
    <>
      <Topbar
        title="Membership"
        subtitle="284 members · Grace Baptist Church"
        actions={
          <>
            <button className="btn btn-outline btn-sm">Transfer</button>
            <button className="btn btn-forest btn-sm">+ Member</button>
          </>
        }
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total members</div><div className="kpi-val">284</div><div className="kpi-meta up">↑ 12 this year</div></div>
          <div className="kpi"><div className="kpi-lbl">Baptisms (YTD)</div><div className="kpi-val">7</div><div className="kpi-meta up">↑ 2 vs 2025</div></div>
          <div className="kpi"><div className="kpi-lbl">Transfers in</div><div className="kpi-val">5</div><div className="kpi-meta neutral">This quarter</div></div>
          <div className="kpi"><div className="kpi-lbl">Transfers out</div><div className="kpi-val">2</div><div className="kpi-meta neutral">This quarter</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Member directory</div><div className="card-link">Export →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Status</th><th>Since</th><th>Giving (YTD)</th><th>Gift Aid</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}><div className="avatar" style={{ background: m.bg, color: m.color }}>{m.initials}</div>{m.name}</div></td>
                  <td><div className={`chip ${m.statusCls}`}>{m.status}</div></td>
                  <td>{m.since}</td>
                  <td>{m.giving}</td>
                  <td><div className={`chip ${m.giftAidCls}`}>{m.giftAid}</div></td>
                  <td><button className="btn btn-outline btn-sm">⬇ Export PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
