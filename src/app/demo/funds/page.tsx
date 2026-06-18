"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState } from "@/contexts/DemoStateContext";

type Transfer = { from: string; to: string; amount: number; date: string };

export default function DemoFunds() {
  const { state, dispatch } = useDemoState();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from: state.funds[0].name, to: state.funds[1].name, amount: "" });
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState("");

  const total = state.funds.reduce((s, f) => s + f.balance, 0);
  const restricted = state.funds.filter(f => f.restricted).reduce((s, f) => s + f.balance, 0);

  const doTransfer = () => {
    setError("");
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (form.from === form.to) { setError("Select different funds."); return; }
    const src = state.funds.find(f => f.name === form.from);
    if (!src || src.balance < amt) { setError("Insufficient balance in source fund."); return; }
    dispatch({ type: "TRANSFER_FUNDS", from: form.from, to: form.to, amount: amt });
    setTransfers(prev => [{ from: form.from, to: form.to, amount: amt, date: new Date().toLocaleDateString("en-GB") }, ...prev]);
    setForm(f => ({ ...f, amount: "" }));
    setShowModal(false);
  };

  return (
    <>
      <Topbar title="Fund Accounts" subtitle="Restricted, unrestricted & designated funds" actions={<button className="btn btn-forest btn-sm" onClick={() => setShowModal(true)}>⇄ Transfer Funds</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total assets</div><div className="kpi-val">£{total.toLocaleString()}</div><div className="kpi-meta up">All funds</div></div>
          <div className="kpi"><div className="kpi-lbl">Restricted</div><div className="kpi-val">£{restricted.toLocaleString()}</div><div className="kpi-meta neutral">{state.funds.filter(f => f.restricted).length} fund{state.funds.filter(f => f.restricted).length !== 1 ? "s" : ""}</div></div>
          <div className="kpi"><div className="kpi-lbl">Unrestricted</div><div className="kpi-val">£{(total - restricted).toLocaleString()}</div><div className="kpi-meta up">Freely available</div></div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Fund breakdown</div></div>
          {state.funds.map(f => {
            const pct = total > 0 ? Math.round(f.balance / total * 100) : 0;
            return (
              <div key={f.name} style={{ padding: "1rem 0", borderBottom: "1px solid var(--border)" }}>
                <div className="fund-head" style={{ marginBottom: "0.5rem" }}>
                  <span className="fund-nm" style={{ fontWeight: 600 }}>{f.name} {f.restricted && <span className="chip chip-gold" style={{ marginLeft: 8, fontSize: "0.75rem" }}>Restricted</span>}</span>
                  <span style={{ fontWeight: 700 }}>£{f.balance.toLocaleString()}</span>
                </div>
                <div className="fund-bar"><div className="fund-fill" style={{ width: `${pct}%`, background: f.color }}></div></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 4 }}>
                  <span>{f.notes}</span><span>{pct}% of total</span>
                </div>
              </div>
            );
          })}
        </div>

        {transfers.length > 0 && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <div className="card-head"><div className="card-title">Transfer log</div></div>
            <table className="tbl">
              <thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th></tr></thead>
              <tbody>
                {transfers.map((t, i) => (
                  <tr key={i}><td>{t.date}</td><td>{t.from}</td><td>{t.to}</td><td>£{t.amount.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 380, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card-title">Transfer Between Funds</div>
            <div className="form-grp"><label>From fund</label><select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}>{state.funds.map(f => <option key={f.name}>{f.name} (£{f.balance.toLocaleString()})</option>)}</select></div>
            <div className="form-grp"><label>To fund</label><select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}>{state.funds.map(f => <option key={f.name}>{f.name}</option>)}</select></div>
            <div className="form-grp"><label>Amount (£)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            {error && <div style={{ color: "var(--rust)", fontSize: "0.88rem" }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={doTransfer}>Confirm Transfer</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowModal(false); setError(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
