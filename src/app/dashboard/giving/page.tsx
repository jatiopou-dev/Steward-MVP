"use client";
import React, { useMemo } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";
import { calculateClaimableGiftAid, Transaction } from "@/utils/giftAid";

export default function GivingPage() {
  const { terms } = useDenomination();

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

  const claimablePence = calculateClaimableGiftAid(mockData);
  const formattedClaimable = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(claimablePence / 100);

  return (
    <>
      <Topbar 
        title={terms.giving}
        subtitle="Regular givers · Gift Aid eligible"
        actions={<button className="btn btn-forest btn-sm">+ Add giver</button>}
      />
      <div className="content">
        <div className="kpi-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="kpi"><div className="kpi-lbl">Active regular givers</div><div className="kpi-val">48</div><div className="kpi-meta up">↑ 4 this quarter</div></div>
          <div className="kpi"><div className="kpi-lbl">Monthly giving total</div><div className="kpi-val">£4,800</div><div className="kpi-meta up">↑ 8% vs last year</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid claimable (YTD)</div><div className="kpi-val">{formattedClaimable}</div><div className="kpi-meta up">Ready to claim</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Regular givers</div><div className="card-link">Gift Aid claim →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>Gift Aid</th><th>Since</th></tr></thead>
            <tbody>
              <tr><td>Mr & Mrs Anderson</td><td>Monthly</td><td>£200</td><td><div className="chip chip-sage">Eligible</div></td><td>2018</td></tr>
              <tr><td>Dr Patricia Moore</td><td>Monthly</td><td>£150</td><td><div className="chip chip-sage">Eligible</div></td><td>2021</td></tr>
              <tr><td>Anonymous</td><td>Monthly</td><td>£500</td><td><div className="chip chip-stone">Not declared</div></td><td>2020</td></tr>
              <tr><td>Rev. J. Clarke (retired)</td><td>Monthly</td><td>£120</td><td><div className="chip chip-sage">Eligible</div></td><td>2015</td></tr>
              <tr><td>Youth group fundraiser</td><td>One-off</td><td>£840</td><td><div className="chip chip-stone">N/A</div></td><td>Apr 2026</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
