"use client";

import React, { useState } from "react";

type Props = {
  giftAidCsv: string;
  claimablePence: number;
  claimableCount: number;
};

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

export default function ReportsClient({
  giftAidCsv,
  claimablePence,
  claimableCount,
}: Props) {
  const [reportType, setReportType] = useState("Monthly Treasurer's Report");
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerate = () => {
    if (reportType === "Gift Aid Claim (HMRC)") {
      const blob = new Blob([giftAidCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "HMRC_Gift_Aid_Claim.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setReportGenerated(true);
  };

  return (
    <div className="content">
      <div className="two-col">
        <div className="card">
          <div className="card-head"><div className="card-title">Generate report</div></div>
          <div className="form-grp"><label>Report type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
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
            <select><option>Current month</option><option>Current quarter</option><option>Financial year YTD</option><option>Full year</option></select>
          </div>
          <div className="form-grp"><label>Audience tone</label>
            <select><option>Board / Deacons (formal)</option><option>Congregation (clear & simple)</option><option>Auditors (technical)</option><option>Charity Commission (statutory)</option></select>
          </div>
          <button className="btn btn-forest" onClick={handleGenerate} style={{width:"100%"}}>
            {reportType === "Gift Aid Claim (HMRC)" ? "⬇ Download HMRC CSV" : "✨ Generate with AI"}
          </button>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Preview</div></div>
          <div style={{padding:"2rem",textAlign:"center",color:"var(--stone2)",fontSize:".84rem", lineHeight: 1.7}}>
            {reportGenerated && reportType === "Gift Aid Claim (HMRC)" ? (
              <span>
                Your <strong>HMRC Charities Online CSV</strong> has been downloaded.
                <br />
                {claimableCount} gift{claimableCount !== 1 ? "s" : ""} · {formatGBP(claimablePence)} claimable.
              </span>
            ) : reportGenerated ? (
              <span>Generating {reportType}... <em>(AI narrative generation remains the next integration step.)</em></span>
            ) : reportType === "Gift Aid Claim (HMRC)" ? (
              <span>
                Ready to export {claimableCount} eligible gift{claimableCount !== 1 ? "s" : ""}.
                <br />
                Estimated claim: <strong>{formatGBP(claimablePence)}</strong>.
              </span>
            ) : (
              <span>Select a report type and click to preview here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

