"use client";
import React, { useState, useRef, useEffect } from "react";
import Topbar from "@/components/dashboard/Topbar";

const scriptedReplies: Record<string, string> = {
  default: "I'm Steward AI, your church finance assistant. Ask me anything about your finances, Gift Aid, or reports!",
  giving: "📈 Covenanted giving is up 8% this quarter. You have 48 active standing orders totalling £4,800/month. Your top 5 givers account for 34% of income.",
  "gift aid": "✅ You have 127 Gift Aid-eligible members. Based on this year's declared giving of £68,400, your estimated Gift Aid reclaim is **£17,100**. I can prepare your R68(i) claim now.",
  budget: "📊 You are 92% through your Q1 budget. Facilities spend is 14% over forecast due to the boiler repair in February. I recommend a £1,200 transfer from reserves.",
  surplus: "💷 Your net surplus for April is £5,340 — £1,100 ahead of last April. At this trajectory, you'll end the financial year with a £12,800 surplus.",
  report: "📄 I can generate: (1) Monthly treasurer report, (2) Q1 board summary, (3) Annual accounts draft, or (4) HMRC Gift Aid R68(i). Which would you like?",
  payroll: "💼 April payroll: Pastor £3,800 + Church Administrator £1,600 = £5,400 total. NI employer contributions: £612. PAYE due to HMRC by 19th May.",
};

function getReply(msg: string): string {
  const lower = msg.toLowerCase();
  for (const key of Object.keys(scriptedReplies)) {
    if (key !== "default" && lower.includes(key)) return scriptedReplies[key];
  }
  return scriptedReplies.default;
}

export default function DemoAI() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm Steward AI 🤖 — your intelligent church finance assistant. Ask me about giving trends, Gift Aid, payroll, budgets, or ask me to draft a report." }
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setThinking(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: getReply(userMsg) }]);
      setThinking(false);
    }, 900);
  };

  return (
    <>
      <Topbar title="AI Assistant" subtitle="Ask your church finances in plain English" />
      <div className="content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 0" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", padding: "0.85rem 1.1rem", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user" ? "var(--forest)" : "var(--card-bg)",
                color: m.role === "user" ? "#fff" : "var(--ink)",
                fontSize: "0.93rem", lineHeight: 1.6,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
              }}>{m.content}</div>
            </div>
          ))}
          {thinking && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "0.85rem 1.1rem", borderRadius: "18px 18px 18px 4px", background: "var(--card-bg)", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
                ✨ Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", padding: "1rem 0 0" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            {["Gift Aid recap", "Giving trend", "Budget status", "Draft report", "Payroll summary"].map(s => (
              <button key={s} onClick={() => { setInput(s); }} className="btn btn-outline btn-sm" style={{ fontSize: "0.82rem" }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask anything about your church finances..."
            style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.95rem" }}
          />
          <button onClick={send} className="btn btn-forest" disabled={thinking}>Send</button>
        </div>
      </div>
    </>
  );
}
