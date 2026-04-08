"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";

export default function PayrollPage() {
  const { terms } = useDenomination();
  
  return (
    <>
      <Topbar 
        title="Payroll"
        subtitle="2 employees · April 2026"
        actions={
          <>
            <button className="btn btn-outline btn-sm">Run payroll</button>
            <button className="btn btn-forest btn-sm">+ Employee</button>
          </>
        }
      />
      <div className="content">
        <div className="kpi-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="kpi"><div className="kpi-lbl">Total payroll (Apr)</div><div className="kpi-val">£5,400</div><div className="kpi-meta neutral">2 employees</div></div>
          <div className="kpi"><div className="kpi-lbl">Employer NI</div><div className="kpi-val">£592</div><div className="kpi-meta neutral">This month</div></div>
          <div className="kpi"><div className="kpi-lbl">Pension (auto-enrol)</div><div className="kpi-val">£270</div><div className="kpi-meta up">All enrolled</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Staff payroll — April 2026</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Gross</th><th>Net pay</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Rev. Sarah Thompson</td><td>Senior {terms.minister}</td><td>£3,200</td><td>£2,490</td><td><div className="chip chip-sage">Paid</div></td></tr>
              <tr><td>James Okafor</td><td>Church Administrator</td><td>£2,200</td><td>£1,740</td><td><div className="chip chip-gold">Pending</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
