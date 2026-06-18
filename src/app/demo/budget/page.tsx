"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";

type BudgetLine = { cat: string; budget: number; actual: number };

const INITIAL: BudgetLine[] = [
  { cat: "Pastoral salaries", budget: 46800, actual: 15200 },
  { cat: "Facilities & maintenance", budget: 12000, actual: 4840 },
  { cat: "Missions & outreach", budget: 8400, actual: 2100 },
  { cat: "Ministry & programs", budget: 6000, actual: 1380 },
  { cat: "Administration", budget: 3600, actual: 890 },
];

export default function DemoBudget() {
  const [lines, setLines] = useState<BudgetLine[]>(INITIAL);
  const [editing, setEditing] = useState<{ row: number; field: "budget" | "actual" } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ category: "", budget: "" });

  const totalBudget = lines.reduce((s, l) => s + l.budget, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual, 0);

  const startEdit = (row: number, field: "budget" | "actual", val: number) => {
    setEditing({ row, field });
    setEditVal(val.toString());
  };

  const commitEdit = () => {
    if (!editing) return;
    const num = parseFloat(editVal);
    if (!isNaN(num) && num >= 0) {
      setLines(prev => prev.map((l, i) => i === editing.row ? { ...l, [editing.field]: num } : l));
    }
    setEditing(null);
  };

  const addLine = () => {
    const budget = parseFloat(addForm.budget) || 0;
    if (!addForm.category) return;
    setLines(prev => [...prev, { cat: addForm.category, budget, actual: 0 }]);
    setAddForm({ category: "", budget: "" });
    setShowAdd(false);
  };

  return (
    <>
      <Topbar title="Budget Tracker" subtitle="Annual budget vs actual spending · click any value to edit" actions={<button className="btn btn-forest btn-sm" onClick={() => setShowAdd(true)}>+ Add line</button>} />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Annual budget</div><div className="kpi-val">£{totalBudget.toLocaleString()}</div><div className="kpi-meta neutral">FY 2025/26</div></div>
          <div className="kpi"><div className="kpi-lbl">Spent (Q1)</div><div className="kpi-val">£{totalActual.toLocaleString()}</div><div className="kpi-meta neutral">{Math.round(totalActual / totalBudget * 100)}% of annual</div></div>
          <div className="kpi"><div className="kpi-lbl">Remaining</div><div className="kpi-val">£{(totalBudget - totalActual).toLocaleString()}</div><div className="kpi-meta up">On track</div></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Budget vs Actual — Q1 2026</div>
            <div className="card-sub" style={{ fontSize: "0.82rem", color: "var(--fg-muted)" }}>💡 Click any budget or actual figure to edit it</div>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Category</th><th>Annual Budget</th><th>Q1 Actual</th><th>% of Q1 target</th><th>Status</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const q1target = l.budget / 4;
                const pct = Math.round((l.actual / q1target) * 100);
                const over = pct > 110;
                return (
                  <tr key={i} style={{ background: over ? "rgba(220,53,69,0.04)" : undefined }}>
                    <td><strong>{l.cat}</strong></td>
                    <td onClick={() => startEdit(i, "budget", l.budget)} style={{ cursor: "pointer", color: "var(--forest)" }}>
                      {editing?.row === i && editing.field === "budget" ? (
                        <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()} style={{ width: 90, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--border)" }} />
                      ) : `£${l.budget.toLocaleString()}`}
                    </td>
                    <td onClick={() => startEdit(i, "actual", l.actual)} style={{ cursor: "pointer", color: "var(--forest)" }}>
                      {editing?.row === i && editing.field === "actual" ? (
                        <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()} style={{ width: 90, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--border)" }} />
                      ) : `£${l.actual.toLocaleString()}`}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div className="fund-bar" style={{ width: 80, margin: 0 }}><div className="fund-fill" style={{ width: `${Math.min(pct, 100)}%`, background: over ? "var(--rust)" : "var(--forest)" }}></div></div>
                        {pct}%
                      </div>
                    </td>
                    <td><div className={`chip ${over ? "chip-gold" : "chip-sage"}`}>{over ? "Over budget" : "On track"}</div></td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700, background: "var(--bg-muted)" }}>
                <td>Total</td>
                <td>£{totalBudget.toLocaleString()}</td>
                <td>£{totalActual.toLocaleString()}</td>
                <td>{Math.round(totalActual / (totalBudget / 4) * 100)}% of Q1</td>
                <td><div className="chip chip-sage">On track</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 380, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card-title">Add Budget Line</div>
            <div className="form-grp"><label>Category</label><input value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Outreach events" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div className="form-grp"><label>Annual budget (£)</label><input type="number" value={addForm.budget} onChange={e => setAddForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)" }} /></div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={addLine}>Add Line</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
