"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState } from "@/contexts/DemoStateContext";

export default function DemoGiving() {
  const { state, dispatch } = useDemoState();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", freq: "Monthly SO", monthly: "", giftAid: false });

  const eligibleGivers = state.givers.filter(g => g.giftAid);
  const totalEligibleYTD = eligibleGivers.reduce((s, g) => s + g.ytd, 0);
  const giftAidEstimate = Math.round(totalEligibleYTD * 0.25);
  const monthlyTotal = state.givers.filter(g => g.freq === "Monthly SO").reduce((s, g) => s + g.monthly, 0);

  const addGiver = () => {
    if (!form.name) return;
    const monthly = parseFloat(form.monthly) || 0;
    dispatch({
      type: "ADD_GIVER",
      giver: { id: Date.now(), name: form.name, freq: form.freq, monthly, ytd: monthly * 4, giftAid: form.giftAid },
    });
    setForm({ name: "", freq: "Monthly SO", monthly: "", giftAid: false });
    setShowAdd(false);
  };

  return (
    <>
      <Topbar title="Planned Giving" subtitle="Covenanted givers · standing orders & pledges" actions={<button className="btn btn-forest btn-sm" onClick={() => setShowAdd(true)}>+ Add Giver</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Monthly regular income</div><div className="kpi-val">£{monthlyTotal.toLocaleString()}</div><div className="kpi-meta up">{state.givers.filter(g => g.freq === "Monthly SO").length} standing orders</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid eligible givers</div><div className="kpi-val">{eligibleGivers.length}</div><div className="kpi-meta neutral">of {state.givers.length} givers</div></div>
          <div className="kpi"><div className="kpi-lbl">Estimated Gift Aid reclaim</div><div className="kpi-val" style={{ color: "var(--sage)" }}>£{giftAidEstimate.toLocaleString()}</div><div className="kpi-meta up">This tax year (25% reclaim)</div></div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Giver register</div><div className="card-link">Export R68(i) →</div></div>
          <p style={{ padding: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--fg-muted)" }}>💡 Click Gift Aid status to toggle eligibility — reclaim estimate updates above.</p>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>YTD</th><th>Gift Aid (click to toggle)</th><th></th></tr></thead>
            <tbody>
              {state.givers.map(g => (
                <tr key={g.id}>
                  <td><strong>{g.name}</strong></td>
                  <td>{g.freq}</td>
                  <td>{g.monthly > 0 ? `£${g.monthly}/mo` : "One-off"}</td>
                  <td>£{g.ytd.toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => dispatch({ type: "TOGGLE_GIFT_AID", id: g.id })}
                      className={`chip ${g.giftAid ? "chip-sage" : "chip-stone"}`}
                      style={{ cursor: "pointer", border: "none", background: "none", padding: 0 }}
                    >
                      {g.giftAid ? "✅ Eligible" : "❌ Not declared"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--rust)", borderColor: "var(--rust)" }}
                      onClick={() => dispatch({ type: "DELETE_GIVER", id: g.id })}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 380, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card-title">Add Giver</div>
            <div className="form-grp"><label>Full name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John & Jane Smith" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div className="form-grp"><label>Giving frequency</label><select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))} style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}><option>Monthly SO</option><option>Quarterly</option><option>Annual</option><option>One-off</option></select></div>
            <div className="form-grp"><label>Monthly amount (£)</label><input type="number" value={form.monthly} onChange={e => setForm(f => ({ ...f, monthly: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><input type="checkbox" id="ga2" checked={form.giftAid} onChange={e => setForm(f => ({ ...f, giftAid: e.target.checked }))} /><label htmlFor="ga2">Gift Aid declaration signed</label></div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={addGiver}>Add Giver</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
