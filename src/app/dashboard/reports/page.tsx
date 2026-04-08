"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function ReportsPage() {
  return (
    <>
      <Topbar 
        title="Reports"
        subtitle="AI-generated · Board ready · One click"
      />
      <div className="content">
        <div className="two-col">
          <div className="card">
            <div className="card-head"><div className="card-title">Generate report</div></div>
            <div className="form-grp"><label>Report type</label>
              <select>
                <option>Monthly Treasurer&apos;s Report</option>
                <option>Quarterly Board / Deacons Summary</option>
                <option>Annual Accounts</option>
                <option>Gift Aid Claim (HMRC)</option>
                <option>Donor / Giver Statements</option>
                <option>Fund Activity Report</option>
                <option>Giving Trends Report</option>
              </select>
            </div>
            <div className="form-grp"><label>Period</label>
              <select><option>April 2026</option><option>Q1 2026 (Jan–Mar)</option><option>Financial year 2025–26 YTD</option><option>Full year 2025</option></select>
            </div>
            <div className="form-grp"><label>Audience tone</label>
              <select><option>Board / Deacons (formal)</option><option>Congregation (clear & simple)</option><option>Auditors (technical)</option><option>Charity Commission (statutory)</option></select>
            </div>
            <button className="btn btn-forest" style={{width:"100%"}}>✨ Generate with AI</button>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Preview</div></div>
            <div style={{padding:"2rem",textAlign:"center",color:"var(--stone2)",fontSize:".84rem"}}>Select a report type and click <strong>Generate with AI</strong> to preview here.</div>
          </div>
        </div>
      </div>
    </>
  );
}
