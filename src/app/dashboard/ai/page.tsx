"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";
import { useChat } from "@ai-sdk/react";

export default function AIPage() {
  const { terms } = useDenomination();
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      denominationData: terms
    }
  });

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
          
          <div className="ai-card" style={{ display: "flex", flexDirection: "column", maxHeight: "600px" }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".9rem"}}>
              <div className="serif" style={{color:"var(--cream)",fontSize:".98rem",fontWeight:600}}>Ask your books</div>
              <div className="ai-badge">✨ Claude AI</div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {messages.length === 0 ? (
                <div className="ai-insight">
                  👋 Ask anything about your finances. Try:<br/><br/>
                  <em>&quot;How much did we spend on worship this year?&quot;</em><br/>
                  <em>&quot;Are we on track with the building fund?&quot;</em><br/>
                  <em>&quot;What&apos;s our Gift Aid claimable this quarter?&quot;</em>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} style={{ 
                    padding: ".8rem", 
                    borderRadius: "6px",
                    background: m.role === "user" ? "rgba(255,255,255,0.05)" : "var(--sage-bg)",
                    color: m.role === "user" ? "var(--cream)" : "var(--sage)",
                    fontSize: ".9rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap"
                  }}>
                    <strong style={{ display: "block", marginBottom: ".3rem", opacity: 0.8, fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      {m.role === "user" ? "You" : "Steward AI"}
                    </strong>
                    {m.content}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="ai-load" style={{ padding: ".8rem" }}><div className="dot"><span></span><span></span><span></span></div></div>
              )}
            </div>

            <div className="ai-prompt">
              <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%", gap: ".5rem" }}>
                <input 
                  className="ai-inp" 
                  type="text" 
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about your finances..."
                  style={{ flex: 1 }}
                />
                <button type="submit" className="ai-send" disabled={isLoading || !input.trim()}>→</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
