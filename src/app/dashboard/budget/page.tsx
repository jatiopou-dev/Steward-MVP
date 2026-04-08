"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function BudgetPage() {
  return (
    <>
      <Topbar 
        title="Budget tracker"
        subtitle="FY 2026 · April YTD"
        actions={<button className="btn btn-outline btn-sm">Set budgets</button>}
      />
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Budget vs actual — April YTD</div></div>
          <div className="bgt-row" style={{borderBottom:"1px solid var(--stone3)",paddingBottom:".5rem",marginBottom:".2rem"}}><div className="bgt-cat" style={{fontSize:".7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--stone2)"}}>Category</div><div className="bgt-track" style={{fontSize:".7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--stone2)"}}>Progress</div><div className="bgt-nums" style={{fontSize:".7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--stone2)"}}>Actual / Budget</div></div>
          <div className="bgt-row"><div className="bgt-cat">Minister & staff wages</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"65%",background:"var(--sage)"}}></div></div></div><div className="bgt-nums">£21,600 / £33,200</div></div>
          <div className="bgt-row"><div className="bgt-cat">Facilities & maintenance</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"78%",background:"var(--gold)"}}></div></div></div><div className="bgt-nums">£7,800 / £10,000</div></div>
          <div className="bgt-row"><div className="bgt-cat">Community outreach</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"32%",background:"var(--sage)"}}></div></div></div><div className="bgt-nums">£2,880 / £9,000</div></div>
          <div className="bgt-row"><div className="bgt-cat">Worship & music</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"88%",background:"var(--rust)"}}></div></div></div><div className="bgt-nums">£2,640 / £3,000</div></div>
          <div className="bgt-row"><div className="bgt-cat">Administration</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"48%",background:"var(--sage)"}}></div></div></div><div className="bgt-nums">£1,920 / £4,000</div></div>
          <div className="bgt-row"><div className="bgt-cat">Mission giving</div><div className="bgt-track"><div className="fund-bar"><div className="fund-fill" style={{width:"40%",background:"var(--sage)"}}></div></div></div><div className="bgt-nums">£1,600 / £4,000</div></div>
        </div>
      </div>
    </>
  );
}
