"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function DemoReports() {
  const reports = [
    { icon: "📄", title: "April Treasurer Report", desc: "Monthly income & expenditure summary", date: "27 Apr 2026", status: "Ready", statusCls: "chip-sage" },
    { icon: "📊", title: "Q1 Board Summary", desc: "Jan–Mar 2026 consolidated report", date: "03 Apr 2026", status: "Ready", statusCls: "chip-sage" },
    { icon: "🏛️", title: "Gift Aid R68(i) Claim", desc: "HMRC submission — £17,100 reclaim", date: "05 Apr 2026", status: "Pending review", statusCls: "chip-gold" },
    { icon: "💼", title: "Annual Payroll Summary", desc: "Tax year 2025/26 P60 preparation", date: "05 Apr 2026", status: "Draft", statusCls: "chip-stone" },
    { icon: "📈", title: "Year-End Financial Accounts", desc: "Draft accounts for charity trustees", date: "In progress", status: "In progress", statusCls: "chip-stone" },
  ];
  return (
    <>
      <Topbar title="Reports" subtitle="AI-generated financial reports · HMRC ready" actions={<button className="btn btn-forest btn-sm">+ Generate report</button>} />
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Report library</div></div>
          <table className="tbl">
            <thead><tr><th>Report</th><th>Description</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i}>
                  <td><span style={{ fontSize: "1.2rem", marginRight: 8 }}>{r.icon}</span><strong>{r.title}</strong></td>
                  <td style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>{r.desc}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.9rem" }}>{r.date}</td>
                  <td><div className={`chip ${r.statusCls}`}>{r.status}</div></td>
                  <td><button className="btn btn-outline btn-sm">⬇ Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ai-card" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
            <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>AI Report Writer</div>
            <div className="ai-badge">✨ Powered by Claude</div>
          </div>
          <div className="ai-insight">📄 Ask me to write a report in plain English: <em>"Write a treasurer's report for April"</em> or <em>"Prepare the HMRC Gift Aid claim for 2025/26."</em></div>
          <button className="btn btn-gold btn-sm" style={{ marginTop: "1rem" }}>Open AI Report Writer →</button>
        </div>
      </div>
    </>
  );
}
