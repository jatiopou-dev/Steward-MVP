"use client";
import React, { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState, Tx } from "@/contexts/DemoStateContext";

const CATEGORIES = ["General Fund", "Building Fund", "Missions Outreach", "Restricted", "Salaries", "Facilities", "Ministry"];

export default function DemoTransactions() {
  const { state, dispatch } = useDemoState();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "inc" | "exp">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [form, setForm] = useState({ name: "", category: "General Fund", amount: "", type: "inc" });

  const filtered = state.transactions
    .filter(t => filter === "all" || t.ico === filter || (filter === "inc" && t.ico === "res"))
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.meta.toLowerCase().includes(search.toLowerCase()));

  const totalIncome = state.transactions.filter(t => t.pence > 0).reduce((s, t) => s + t.pence, 0);
  const totalExp = state.transactions.filter(t => t.pence < 0).reduce((s, t) => s + t.pence, 0);
  const net = totalIncome + totalExp;

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "General Fund", amount: "", type: "inc" });
    setShowModal(true);
  };

  const openEdit = (tx: Tx) => {
    setEditing(tx);
    setForm({
      name: tx.name,
      category: tx.meta.split(" · ")[0],
      amount: (Math.abs(tx.pence) / 100).toString(),
      type: tx.pence >= 0 ? "inc" : "exp",
    });
    setShowModal(true);
  };

  const save = () => {
    const pence = Math.round(parseFloat(form.amount) * 100) * (form.type === "inc" ? 1 : -1);
    if (!form.name || isNaN(pence)) return;
    const display = `${form.type === "inc" ? "+" : "-"}£${Math.abs(parseFloat(form.amount)).toFixed(2)}`;
    if (editing) {
      dispatch({
        type: "EDIT_TX",
        tx: { ...editing, ico: form.type as "inc" | "exp", name: form.name, meta: form.category, amt: display, pence },
      });
    } else {
      dispatch({
        type: "ADD_TX",
        tx: {
          id: Date.now(),
          ico: form.type as "inc" | "exp",
          emoji: form.type === "inc" ? "🎁" : "🏢",
          name: form.name,
          meta: form.category,
          amt: display,
          pence,
          chip: "Manual",
          chipCls: "chip-stone",
        },
      });
    }
    setForm({ name: "", category: "General Fund", amount: "", type: "inc" });
    setShowModal(false);
    setEditing(null);
  };

  return (
    <>
      <Topbar
        title="Transactions"
        subtitle="All income and expenditure · AI-categorised"
        actions={<>
          <Link href="/demo/transactions/import" className="btn btn-outline btn-sm">⬇ Import CSV</Link>
          <button className="btn btn-forest btn-sm" onClick={openAdd}>+ Add</button>
        </>}
      />

      <div style={{ display: "flex", gap: "1rem", padding: "0 1.5rem" }}>
        <div className="kpi" style={{ flex: 1 }}><div className="kpi-lbl">Total Income</div><div className="kpi-val" style={{ fontSize: "1.4rem", color: "var(--sage)" }}>+£{(totalIncome / 100).toLocaleString()}</div></div>
        <div className="kpi" style={{ flex: 1 }}><div className="kpi-lbl">Total Expenditure</div><div className="kpi-val" style={{ fontSize: "1.4rem", color: "var(--rust)" }}>-£{(Math.abs(totalExp) / 100).toLocaleString()}</div></div>
        <div className="kpi" style={{ flex: 1 }}><div className="kpi-lbl">Net</div><div className="kpi-val" style={{ fontSize: "1.4rem", color: net >= 0 ? "var(--sage)" : "var(--rust)" }}>{net >= 0 ? "+" : ""}£{(net / 100).toLocaleString()}</div></div>
      </div>

      <div className="content" style={{ paddingTop: "0.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.9rem" }} />
          {(["all", "inc", "exp"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? "btn-forest" : "btn-outline"}`}>
              {f === "all" ? "All" : f === "inc" ? "Income" : "Expenditure"}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="tx-list">
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--fg-muted)" }}>No transactions match your search.</div>
            ) : filtered.map((tx) => (
              <div className="tx" key={tx.id} style={{ cursor: "pointer" }} onClick={() => openEdit(tx)}>
                <div className={`tx-ico ${tx.ico}`}>{tx.emoji}</div>
                <div className="tx-body">
                  <div className="tx-name">{tx.name}</div>
                  <div className="tx-meta">{tx.meta}</div>
                </div>
                <div className={`tx-amt ${tx.pence >= 0 ? "inc" : "exp"}`}>{tx.amt}</div>
                {tx.chip && <div className={`chip ${tx.chipCls}`}>{tx.chip}</div>}
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginLeft: "0.5rem", color: "var(--rust)", borderColor: "var(--rust)", fontSize: "0.8rem" }}
                  onClick={e => { e.stopPropagation(); dispatch({ type: "DELETE_TX", id: tx.id }); }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 420, padding: "2rem", gap: "1rem", display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ marginBottom: "0.5rem" }}>{editing ? "Edit Transaction" : "Add Transaction"}</div>
            <div className="form-grp">
              <label>Type</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setForm(f => ({ ...f, type: "inc" }))} className={`btn btn-sm ${form.type === "inc" ? "btn-forest" : "btn-outline"}`}>Income</button>
                <button onClick={() => setForm(f => ({ ...f, type: "exp" }))} className={`btn btn-sm ${form.type === "exp" ? "btn-forest" : "btn-outline"}`}>Expenditure</button>
              </div>
            </div>
            <div className="form-grp"><label>Description</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday offering" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div className="form-grp"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="form-grp"><label>Amount (£)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={save}>{editing ? "Save Changes" : "Add Transaction"}</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
