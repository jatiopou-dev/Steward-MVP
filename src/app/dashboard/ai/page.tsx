"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";

export default function AIPage() {
  const { terms } = useDenomination();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{id: string, role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { id: Date.now().toString(), role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, denominationData: terms })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-ai", role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantMsg += chunk;
        
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { id: prev[prev.length - 1].id, role: "assistant", content: assistantMsg }
        ]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
              <form onSubmit={onSubmit} style={{ display: "flex", width: "100%", gap: ".5rem" }}>
                <input 
                  className="ai-inp" 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
