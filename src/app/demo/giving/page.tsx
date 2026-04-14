"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
export default function DemoGiving() {
  const givers = [
    { name: "Sarah Anderson", freq: "Monthly SO", amount: "£200/mo", ytd: "£800", giftAid: true },
    { name: "James & Ruth Okafor", freq: "Monthly SO", amount: "£150/mo", ytd: "£600", giftAid: false },
    { name: "Patricia Moore", freq: "Monthly SO", amount: "£150/mo", ytd: "£600", giftAid: true },
    { name: "David Wilson", freq: "Quarterly", amount: "£320/qtr", ytd: "£320", giftAid: true },
    { name: "Anonymous (Gift Day)", freq: "One-off", amount: "£500", ytd: "£500", giftAid: false },
    { name: "Rachel & Tom Brooks", freq: "Monthly SO", amount: "£100/mo", ytd: "£400", giftAid: true },
  ];
  return (
    <>
      <Topbar title="Planned Giving" subtitle="Covenanted givers · standing orders & pledges" actions={<button className="btn btn-forest btn-sm">+ Add Giver</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Monthly regular income</div><div className="kpi-val">£4,800</div><div className="kpi-meta up">48 standing orders</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid eligible</div><div className="kpi-val">127</div><div className="kpi-meta neutral">of 284 members</div></div>
          <div className="kpi"><div className="kpi-lbl">Estimated Gift Aid</div><div className="kpi-val">£17,100</div><div className="kpi-meta up">This tax year</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Giver register</div><div className="card-link">Export R68(i) →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>YTD</th><th>Gift Aid</th></tr></thead>
            <tbody>
              {givers.map((g, i) => (
                <tr key={i}>
                  <td><strong>{g.name}</strong></td>
                  <td>{g.freq}</td>
                  <td>{g.amount}</td>
                  <td>{g.ytd}</td>
                  <td><div className={`chip ${g.giftAid ? "chip-sage" : "chip-stone"}`}>{g.giftAid ? "Eligible" : "Not declared"}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
