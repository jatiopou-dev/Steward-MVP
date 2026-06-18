"use client";
import React, { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";
import { useDemoState, Tx } from "@/contexts/DemoStateContext";

const CATEGORIES = ["General Fund", "Building Fund", "Missions Outreach", "Restricted", "Salaries", "Facilities", "Ministry"];

export default function DemoOverview() {
  const { terms } = useDenomination();
  const { state, dispatch } = useDemoState();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "General Fund", amount: "", type: "inc" });

  const totalIncome = state.transactions.filter(t => t.pence > 0).reduce((s, t) => s + t.pence, 0);
  const totalExp = state.transactions.filter(t => t.pence < 0).reduce((s, t) => s + t.pence, 0);
  const surplus = totalIncome + totalExp;
  const monthlyGiving = state.givers.filter(g => g.freq === "Monthly SO").reduce((s, g) => s + g.monthly, 0);
  const totalFunds = state.funds.reduce((s, f) => s + f.balance, 0);

  const addTx = () => {
    const pence = Math.round(parseFloat(form.amount) * 100) * (form.type === "inc" ? 1 : -1);
    if (!form.name || isNaN(pence)) return;
    const display = `${form.type === "inc" ? "+" : "-"}£${Math.abs(parseFloat(form.amount)).toFixed(2)}`;
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
    setForm({ name: "", category: "General Fund", amount: "", type: "inc" });
    setShowAdd(false);
  };

  return (
    <>
      <Topbar
        title="Good morning 👋"
        subtitle={`Grace ${terms.label} Church · April 2026`}
        actions={
          <>
            <Link href="/demo/reports" className="btn btn-outline btn-sm">Generate report</Link>
            <button className="btn btn-forest btn-sm" onClick={() => setShowAdd(true)}>+ Transaction</button>
          </>
        }
      />

      <div className="content">
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Total income (Apr)</div>
            <div className="kpi-val">£{(totalIncome / 100).toLocaleString()}</div>
            <div className="kpi-meta up">↑ 11.2% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total expenditure</div>
            <div className="kpi-val">£{(Math.abs(totalExp) / 100).toLocaleString()}</div>
            <div className="kpi-meta down">↑ 4.8% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Net surplus</div>
            <div className="kpi-val" style={{ color: surplus < 0 ? "var(--rust)" : undefined }}>
              £{(surplus / 100).toLocaleString()}
            </div>
            <div className="kpi-meta up">↑ 22% vs Apr 2025</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">{terms.giving}</div>
            <div className="kpi-val">£{monthlyGiving.toLocaleString()}</div>
            <div className="kpi-meta neutral">{state.givers.filter(g => g.freq === "Monthly SO").length} active givers</div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Recent transactions</div>
                <div className="card-sub">AI-categorised · this month</div>
              </div>
              <Link href="/demo/transactions" className="card-link">View all →</Link>
            </div>
            <div className="tx-list">
              {state.transactions.slice(0, 5).map((tx) => (
                <div className="tx" key={tx.id}>
                  <div className={`tx-ico ${tx.ico}`}>{tx.emoji}</div>
                  <div className="tx-body">
                    <div className="tx-name">{tx.name}</div>
                    <div className="tx-meta">{tx.meta}</div>
                  </div>
                  <div className={`tx-amt ${tx.ico}`}>{tx.amt}</div>
                  {tx.chip && <div className={`chip ${tx.chipCls}`}>{tx.chip}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Fund allocation</div>
                <Link href="/demo/funds" className="card-link">Manage →</Link>
              </div>
              <div className="fund-rows">
                {state.funds.map((f) => {
                  const pct = totalFunds > 0 ? Math.round(f.balance / totalFunds * 100) : 0;
                  return (
                    <div key={f.name}>
                      <div className="fund-head">
                        <span className="fund-nm">{f.name}</span>
                        <span className="fund-vl">{pct}%</span>
                      </div>
                      <div className="fund-bar">
                        <div className="fund-fill" style={{ width: `${pct}%`, background: f.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ai-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
                <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>AI insights</div>
                <div className="ai-badge">✨ Live</div>
              </div>
              <div className="ai-insight">
                📈 Giving is 11% ahead of last April. At this rate you will exceed your annual income target by approximately{" "}
                <strong style={{ color: "var(--gold3)" }}>£8,400</strong>.
              </div>
              <div className="ai-insight">
                ⚠️ Building fund repair work is scheduled for June. At current rate, the fund covers the estimated £12,000 cost with £3,200 to spare.
              </div>
              {state.payrollRan && (
                <div className="ai-insight">
                  ✅ Payroll processed for this month. All staff payments posted to Salaries fund.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 420, padding: "2rem", gap: "1rem", display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ marginBottom: "0.5rem" }}>Add Transaction</div>
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
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={addTx}>Add Transaction</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
