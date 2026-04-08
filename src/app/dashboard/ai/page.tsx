"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";

export default function AIPage() {
  return (
    <>
      <Topbar 
        title="AI assistant"
        subtitle="Ask questions · Upload statements · Get insights"
      />
      <div className="content">
        <div className="two-col">
          <div className="card">
            <div className="card-head"><div className="card-title">Upload bank statement</div></div>
            <div className="upload-zone" style={{ cursor: "pointer" }}>
              <div style={{fontSize:"1.8rem",marginBottom:".6rem"}}>📁</div>
              <div style={{fontSize:".88rem",fontWeight:500,color:"var(--ink2)"}}>Drop bank statement here</div>
              <div style={{fontSize:".76rem",color:"var(--stone2)",marginTop:".25rem"}}>CSV, PDF, OFX · AI will auto-categorise all transactions</div>
            </div>
            <button className="btn btn-forest" style={{width:"100%",marginTop:"1rem"}}>Upload & categorise with AI</button>
          </div>
          <div className="ai-card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".9rem"}}>
              <div className="serif" style={{color:"var(--cream)",fontSize:".98rem",fontWeight:600}}>Ask your books</div>
              <div className="ai-badge">✨ Claude AI</div>
            </div>
            <div className="ai-insight">👋 Ask anything about your finances. Try:<br/><em>&quot;How much did we spend on worship this year?&quot;</em><br/><em>&quot;Are we on track with the building fund?&quot;</em><br/><em>&quot;What&apos;s our Gift Aid claimable this quarter?&quot;</em></div>
            <div className="ai-prompt">
              <input className="ai-inp" type="text" placeholder="Ask about your finances..."/>
              <button className="ai-send">→</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
