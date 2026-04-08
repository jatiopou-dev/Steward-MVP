"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function MembersPage() {
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
            <thead><tr><th>Name</th><th>Status</th><th>Since</th><th>Giving (YTD)</th><th>Gift Aid</th></tr></thead>
            <tbody>
              <tr><td><div style={{display:"flex",alignItems:"center",gap:".6rem"}}><div className="avatar" style={{background:"var(--sage-bg)",color:"var(--sage)"}}>SA</div>Sarah Anderson</div></td><td><div className="chip chip-sage">Active</div></td><td>2014</td><td>£2,400</td><td><div className="chip chip-sage">Eligible</div></td></tr>
              <tr><td><div style={{display:"flex",alignItems:"center",gap:".6rem"}}><div className="avatar" style={{background:"var(--gold-bg)",color:"var(--gold)"}}>JO</div>James Okafor</div></td><td><div className="chip chip-sage">Active</div></td><td>2019</td><td>£1,800</td><td><div className="chip chip-stone">Not declared</div></td></tr>
              <tr><td><div style={{display:"flex",alignItems:"center",gap:".6rem"}}><div className="avatar" style={{background:"var(--rust-bg)",color:"var(--rust)"}}>PM</div>Patricia Moore</div></td><td><div className="chip chip-sage">Active</div></td><td>2021</td><td>£1,800</td><td><div className="chip chip-sage">Eligible</div></td></tr>
              <tr><td><div style={{display:"flex",alignItems:"center",gap:".6rem"}}><div className="avatar" style={{background:"var(--sage-bg)",color:"var(--forest)"}}>DW</div>David Wilson</div></td><td><div className="chip chip-gold">Transfer pending</div></td><td>2016</td><td>£640</td><td><div className="chip chip-sage">Eligible</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
