"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
export default function DemoPayroll() {
  const staff = [
    { name: "Rev. Michael Ade", role: "Senior Pastor", gross: "£3,800", ni: "£390", net: "£3,190", status: "Paid" },
    { name: "Grace Mensah", role: "Church Administrator", gross: "£1,600", ni: "£130", net: "£1,395", status: "Paid" },
  ];
  return (
    <>
      <Topbar title="Payroll" subtitle="Staff payroll · April 2026" actions={<button className="btn btn-forest btn-sm">Run payroll</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total gross pay</div><div className="kpi-val">£5,400</div><div className="kpi-meta neutral">2 employees</div></div>
          <div className="kpi"><div className="kpi-lbl">Employer NI</div><div className="kpi-val">£612</div><div className="kpi-meta neutral">Due 19 May</div></div>
          <div className="kpi"><div className="kpi-lbl">PAYE to HMRC</div><div className="kpi-val">£203</div><div className="kpi-meta neutral">Due 19 May</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">April payroll run</div><div className="card-link">Download payslips →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Gross</th><th>NI (EE)</th><th>Net pay</th><th>Status</th></tr></thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={i}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.role}</td>
                  <td>{s.gross}</td>
                  <td>{s.ni}</td>
                  <td><strong>{s.net}</strong></td>
                  <td><div className="chip chip-sage">{s.status}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
