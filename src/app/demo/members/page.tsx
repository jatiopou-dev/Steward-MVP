"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState, Member } from "@/contexts/DemoStateContext";

export default function DemoMembers() {
  const { state, dispatch } = useDemoState();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: "", since: new Date().getFullYear().toString(), giving: "", giftAid: false });

  const filtered = state.members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const eligibleCount = state.members.filter(m => m.giftAid).length;

  const addMember = () => {
    if (!form.name) return;
    const initials = form.name.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
    const pence = Math.round(parseFloat(form.giving || "0") * 100);
    dispatch({
      type: "ADD_MEMBER",
      member: {
        id: Date.now(), initials, name: form.name, bg: "var(--sage-bg)", color: "var(--forest)",
        status: "Active", statusCls: "chip-sage", since: parseInt(form.since),
        giving: form.giving ? `£${parseFloat(form.giving).toFixed(0)}` : "—", pence,
        giftAid: form.giftAid,
      },
    });
    setForm({ name: "", since: new Date().getFullYear().toString(), giving: "", giftAid: false });
    setShowAdd(false);
  };

  return (
    <>
      <Topbar
        title="Membership"
        subtitle={`${state.members.length} members · Grace Baptist Church`}
        actions={<>
          <button className="btn btn-outline btn-sm">Transfer</button>
          <button className="btn btn-forest btn-sm" onClick={() => setShowAdd(true)}>+ Member</button>
        </>}
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total members</div><div className="kpi-val">{state.members.length}</div><div className="kpi-meta up">↑ 12 this year</div></div>
          <div className="kpi"><div className="kpi-lbl">Baptisms (YTD)</div><div className="kpi-val">7</div><div className="kpi-meta up">↑ 2 vs 2025</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid eligible</div><div className="kpi-val">{eligibleCount}</div><div className="kpi-meta neutral">of {state.members.length} members</div></div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.9rem" }} />
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Member directory</div><div className="card-link">Export →</div></div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Status</th><th>Since</th><th>Giving (YTD)</th><th>Gift Aid</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => setSelected(m)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}><div className="avatar" style={{ background: m.bg, color: m.color }}>{m.initials}</div>{m.name}</div></td>
                  <td><div className={`chip ${m.statusCls}`}>{m.status}</div></td>
                  <td>{m.since}</td>
                  <td>{m.giving}</td>
                  <td><div className={`chip ${m.giftAid ? "chip-sage" : "chip-stone"}`}>{m.giftAid ? "Eligible" : "Not declared"}</div></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn btn-outline btn-sm">⬇ PDF</button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: "var(--rust)", borderColor: "var(--rust)" }}
                        onClick={() => dispatch({ type: "DELETE_MEMBER", id: m.id })}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "flex-end", zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div className="card" style={{ width: 360, height: "100%", borderRadius: "16px 0 0 16px", overflowY: "auto", padding: "2rem" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="avatar" style={{ background: selected.bg, color: selected.color, width: 52, height: 52, fontSize: "1.2rem" }}>{selected.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selected.name}</div>
                <div className={`chip ${selected.statusCls}`} style={{ marginTop: 4 }}>{selected.status}</div>
              </div>
            </div>
            <div className="setting-row"><div className="setting-label">Member since</div><strong>{selected.since}</strong></div>
            <div className="setting-row"><div className="setting-label">Giving (YTD)</div><strong>{selected.giving}</strong></div>
            <div className="setting-row"><div className="setting-label">Gift Aid</div><strong>{selected.giftAid ? "✅ Eligible" : "❌ Not declared"}</strong></div>
            <div className="setting-row"><div className="setting-label">Years of membership</div><strong>{new Date().getFullYear() - selected.since} years</strong></div>
            <div style={{ marginTop: "1.5rem" }}>
              <div className="card-title" style={{ marginBottom: "0.75rem" }}>Giving history</div>
              {["Jan", "Feb", "Mar", "Apr"].map((mo, i) => {
                const pct = [72, 85, 91, 100][i];
                return (
                  <div key={mo} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 2 }}>
                      <span>{mo} 2026</span><span>£{Math.round(selected.pence / 100 / 4)} / mo</span>
                    </div>
                    <div className="fund-bar"><div className="fund-fill" style={{ width: `${pct}%`, background: "var(--forest)" }}></div></div>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-outline" style={{ width: "100%", marginTop: "1.5rem" }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 400, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card-title">Add New Member</div>
            <div className="form-grp"><label>Full name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div className="form-grp"><label>Member since (year)</label><input type="number" value={form.since} onChange={e => setForm(f => ({ ...f, since: e.target.value }))} style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div className="form-grp"><label>Annual giving (£)</label><input type="number" value={form.giving} onChange={e => setForm(f => ({ ...f, giving: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><input type="checkbox" id="ga" checked={form.giftAid} onChange={e => setForm(f => ({ ...f, giftAid: e.target.checked }))} /><label htmlFor="ga">Gift Aid declaration signed</label></div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={addMember}>Add Member</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
