"use client";
import React, { useState, useMemo } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { generateHmrcCsv, Transaction } from "@/utils/giftAid";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("Monthly Treasurer's Report");
  const [reportGenerated, setReportGenerated] = useState(false);

  const mockData: Transaction[] = useMemo(() => [
    {
      id: "1", amountPence: 20000, date: new Date("2026-04-01"), isGiftAidClaimed: false,
      member: { title: "Mr", firstName: "John", surname: "Anderson", houseNameOrNumber: "12", postcode: "SW1A 1AA", isGiftAidEligible: true }
    },
    {
      id: "2", amountPence: 15000, date: new Date("2026-04-10"), isGiftAidClaimed: false,
      member: { title: "Dr", firstName: "Patricia", surname: "Moore", houseNameOrNumber: "The Rectory", postcode: "NW1 3AA", isGiftAidEligible: true }
    },
    {
      id: "3", amountPence: 12000, date: new Date("2026-04-15"), isGiftAidClaimed: false,
      member: { title: "Rev", firstName: "J.", surname: "Clarke", houseNameOrNumber: "Flat 4", postcode: "E1 2AB", isGiftAidEligible: true }
    }
  ], []);

  const handleGenerate = () => {
    if (reportType === "Gift Aid Claim (HMRC)") {
      const csvContent = generateHmrcCsv(mockData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "HMRC_Gift_Aid_Claim.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setReportGenerated(true);
  };

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
              <select><option>April 2026</option><option>Q1 2026 (Jan–Mar)</option><option>Financial year 2025–26 YTD</option><option>Full year 2025</option></select>
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
            <div style={{padding:"2rem",textAlign:"center",color:"var(--stone2)",fontSize:".84rem"}}>
              {reportGenerated && reportType === "Gift Aid Claim (HMRC)" ? (
                <span>Your strict <strong>HMRC Charities Online CSV</strong> has been downloaded securely.</span>
              ) : reportGenerated ? (
                <span>Generating {reportType}... <em>(This requires an API Key in .env.local)</em></span>
              ) : (
                <span>Select a report type and click to preview here.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
