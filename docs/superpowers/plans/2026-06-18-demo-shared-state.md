# Demo Shared State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace isolated per-page `useState` in all `/demo` pages with a single `DemoStateContext` so numbers are live and consistent across pages, add delete/edit on all list pages, make reports generate a real P&L, and add a reset button.

**Architecture:** `DemoStateContext` (React context + `useReducer`) wraps `/demo/layout.tsx`. All seed data moves into `INITIAL_STATE` in the context. Each demo page dispatches typed actions instead of managing its own state. Overview KPIs derive from `transactions` array at render time.

**Tech Stack:** React 18 context + useReducer, Next.js App Router, TypeScript, CSS custom properties (no Tailwind for styles).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| **Create** | `src/contexts/DemoStateContext.tsx` | Context, types, reducer, INITIAL_STATE, provider, hook |
| **Modify** | `src/app/demo/layout.tsx` | Wrap with `DemoStateProvider`, add Reset button |
| **Modify** | `src/app/demo/page.tsx` | Live KPIs from context, wire buttons |
| **Modify** | `src/app/demo/transactions/page.tsx` | Use context, add delete + edit |
| **Modify** | `src/app/demo/members/page.tsx` | Use context, add delete |
| **Modify** | `src/app/demo/giving/page.tsx` | Use context, add delete |
| **Modify** | `src/app/demo/funds/page.tsx` | Use context for fund state |
| **Modify** | `src/app/demo/budget/page.tsx` | Wire dead "+ Add line" button |
| **Modify** | `src/app/demo/payroll/page.tsx` | Dispatch `SET_PAYROLL_RAN` |
| **Modify** | `src/app/demo/reports/page.tsx` | Read transactions from context, generate real P&L, wire print |

---

## Task 1: Create DemoStateContext

**Files:**
- Create: `src/contexts/DemoStateContext.tsx`

- [ ] **Step 1: Create the context file with all types, INITIAL_STATE, reducer, provider, and hook**

```tsx
"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type Tx = {
  id: number;
  ico: "inc" | "exp" | "res";
  emoji: string;
  name: string;
  meta: string;
  amt: string;
  pence: number;
  chip: string;
  chipCls: string;
};

export type Member = {
  id: number;
  initials: string;
  name: string;
  bg: string;
  color: string;
  status: string;
  statusCls: string;
  since: number;
  giving: string;
  pence: number;
  giftAid: boolean;
};

export type Giver = {
  id: number;
  name: string;
  freq: string;
  monthly: number;
  ytd: number;
  giftAid: boolean;
};

export type Fund = {
  name: string;
  balance: number;
  color: string;
  restricted: boolean;
  notes: string;
};

export type DemoState = {
  transactions: Tx[];
  members: Member[];
  givers: Giver[];
  funds: Fund[];
  payrollRan: boolean;
};

// ── Seed data ──────────────────────────────────────────────────────────────

export const INITIAL_STATE: DemoState = {
  transactions: [
    { id: 1, ico: "inc", emoji: "🎁", name: "Sunday offering — 27 Apr", meta: "General Fund · Plate offering", amt: "+£3,840", pence: 384000, chip: "AI categorised", chipCls: "chip-sage" },
    { id: 2, ico: "res", emoji: "💰", name: "National Lottery Community Fund", meta: "Restricted · Community outreach fund", amt: "+£5,000", pence: 500000, chip: "Restricted", chipCls: "chip-gold" },
    { id: 3, ico: "exp", emoji: "🏢", name: "Building maintenance — Apex Ltd", meta: "Facilities", amt: "-£1,200", pence: -120000, chip: "", chipCls: "" },
    { id: 4, ico: "inc", emoji: "🎁", name: "Covenanted giving — April batch", meta: "General Fund · 48 standing orders", amt: "+£4,800", pence: 480000, chip: "Auto", chipCls: "chip-sage" },
    { id: 5, ico: "exp", emoji: "💼", name: "Pastor payroll — April", meta: "Salaries", amt: "-£5,400", pence: -540000, chip: "", chipCls: "" },
    { id: 6, ico: "inc", emoji: "🎁", name: "Gift Day — Easter appeal", meta: "Building fund · One-off gifts", amt: "+£2,840", pence: 284000, chip: "AI categorised", chipCls: "chip-sage" },
    { id: 7, ico: "exp", emoji: "🎵", name: "Music equipment — worship team", meta: "Ministry · Capital purchase", amt: "-£680", pence: -68000, chip: "", chipCls: "" },
  ],
  members: [
    { id: 1, initials: "SA", name: "Sarah Anderson", bg: "var(--sage-bg)", color: "var(--sage)", status: "Active", statusCls: "chip-sage", since: 2014, giving: "£2,400", pence: 240000, giftAid: true },
    { id: 2, initials: "JO", name: "James Okafor", bg: "var(--gold-bg)", color: "var(--gold)", status: "Active", statusCls: "chip-sage", since: 2019, giving: "£1,800", pence: 180000, giftAid: false },
    { id: 3, initials: "PM", name: "Patricia Moore", bg: "var(--rust-bg)", color: "var(--rust)", status: "Active", statusCls: "chip-sage", since: 2021, giving: "£1,800", pence: 180000, giftAid: true },
    { id: 4, initials: "DW", name: "David Wilson", bg: "var(--sage-bg)", color: "var(--forest)", status: "Transfer pending", statusCls: "chip-gold", since: 2016, giving: "£640", pence: 64000, giftAid: true },
    { id: 5, initials: "RB", name: "Rachel Brooks", bg: "var(--gold-bg)", color: "var(--gold)", status: "Active", statusCls: "chip-sage", since: 2020, giving: "£1,200", pence: 120000, giftAid: true },
    { id: 6, initials: "TN", name: "Thomas Nwachukwu", bg: "var(--sage-bg)", color: "var(--sage)", status: "Active", statusCls: "chip-sage", since: 2018, giving: "£960", pence: 96000, giftAid: false },
  ],
  givers: [
    { id: 1, name: "Sarah Anderson", freq: "Monthly SO", monthly: 200, ytd: 800, giftAid: true },
    { id: 2, name: "James & Ruth Okafor", freq: "Monthly SO", monthly: 150, ytd: 600, giftAid: false },
    { id: 3, name: "Patricia Moore", freq: "Monthly SO", monthly: 150, ytd: 600, giftAid: true },
    { id: 4, name: "David Wilson", freq: "Quarterly", monthly: 107, ytd: 320, giftAid: true },
    { id: 5, name: "Anonymous (Gift Day)", freq: "One-off", monthly: 0, ytd: 500, giftAid: false },
    { id: 6, name: "Rachel & Tom Brooks", freq: "Monthly SO", monthly: 100, ytd: 400, giftAid: true },
  ],
  funds: [
    { name: "General Fund", balance: 42810, color: "var(--forest)", restricted: false, notes: "Day-to-day operations" },
    { name: "Building Fund", balance: 18200, color: "var(--gold)", restricted: false, notes: "June renovation target: £12,000" },
    { name: "Community Outreach", balance: 12300, color: "var(--sage)", restricted: true, notes: "National Lottery — restricted" },
    { name: "Mission Giving", balance: 9050, color: "var(--stone2)", restricted: false, notes: "Partnership with 3 overseas missions" },
  ],
  payrollRan: false,
};

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_TX"; tx: Tx }
  | { type: "DELETE_TX"; id: number }
  | { type: "EDIT_TX"; tx: Tx }
  | { type: "ADD_MEMBER"; member: Member }
  | { type: "DELETE_MEMBER"; id: number }
  | { type: "ADD_GIVER"; giver: Giver }
  | { type: "DELETE_GIVER"; id: number }
  | { type: "TOGGLE_GIFT_AID"; id: number }
  | { type: "TRANSFER_FUNDS"; from: string; to: string; amount: number }
  | { type: "SET_PAYROLL_RAN" }
  | { type: "RESET" };

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "ADD_TX":
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case "DELETE_TX":
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
    case "EDIT_TX":
      return { ...state, transactions: state.transactions.map(t => t.id === action.tx.id ? action.tx : t) };
    case "ADD_MEMBER":
      return { ...state, members: [...state.members, action.member] };
    case "DELETE_MEMBER":
      return { ...state, members: state.members.filter(m => m.id !== action.id) };
    case "ADD_GIVER":
      return { ...state, givers: [...state.givers, action.giver] };
    case "DELETE_GIVER":
      return { ...state, givers: state.givers.filter(g => g.id !== action.id) };
    case "TOGGLE_GIFT_AID":
      return { ...state, givers: state.givers.map(g => g.id === action.id ? { ...g, giftAid: !g.giftAid } : g) };
    case "TRANSFER_FUNDS":
      return {
        ...state,
        funds: state.funds.map(f =>
          f.name === action.from ? { ...f, balance: Math.round((f.balance - action.amount) * 100) / 100 } :
          f.name === action.to   ? { ...f, balance: Math.round((f.balance + action.amount) * 100) / 100 } : f
        ),
      };
    case "SET_PAYROLL_RAN":
      return { ...state, payrollRan: true };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────

type DemoContextType = {
  state: DemoState;
  dispatch: React.Dispatch<Action>;
};

const DemoStateContext = createContext<DemoContextType | undefined>(undefined);

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <DemoStateContext.Provider value={{ state, dispatch }}>
      {children}
    </DemoStateContext.Provider>
  );
}

export function useDemoState() {
  const ctx = useContext(DemoStateContext);
  if (!ctx) throw new Error("useDemoState must be used inside DemoStateProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/DemoStateContext.tsx
git commit -m "feat: add DemoStateContext with reducer and seed data"
```

---

## Task 2: Wire context into demo layout + add Reset button

**Files:**
- Modify: `src/app/demo/layout.tsx`

- [ ] **Step 1: Replace existing layout with one that wraps DemoStateProvider and adds Reset button**

Replace the entire file content with:

```tsx
import React from "react";
import Link from "next/link";
import DemoSidebar from "@/components/demo/DemoSidebar";
import { DenominationProvider } from "@/contexts/DenominationContext";
import { DemoStateProvider } from "@/contexts/DemoStateContext";
import DemoResetButton from "@/components/demo/DemoResetButton";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DenominationProvider>
      <DemoStateProvider>
        <div id="dashboard" className="screen active" style={{ flexDirection: "row" }}>
          <DemoSidebar />
          <div className="main-area" style={{ position: "relative" }}>
            {/* Demo Banner */}
            <div style={{
              background: "linear-gradient(90deg, var(--forest) 0%, var(--forest2) 100%)",
              color: "#fff",
              padding: "0.6rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.88rem",
              gap: "1rem",
              flexShrink: 0,
            }}>
              <span>
                🎭 <strong>Live Demo Mode</strong> — Browsing Steward with sample data for Grace Baptist Church. No real data stored.
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <DemoResetButton />
                <Link href="/auth" className="btn btn-gold btn-sm" style={{ whiteSpace: "nowrap" }}>
                  Sign up free →
                </Link>
              </div>
            </div>
            {children}
          </div>
        </div>
      </DemoStateProvider>
    </DenominationProvider>
  );
}
```

- [ ] **Step 2: Create `DemoResetButton` client component**

Create `src/components/demo/DemoResetButton.tsx`:

```tsx
"use client";
import React from "react";
import { useDemoState } from "@/contexts/DemoStateContext";

export default function DemoResetButton() {
  const { dispatch } = useDemoState();
  return (
    <button
      className="btn btn-outline btn-sm"
      style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
      onClick={() => dispatch({ type: "RESET" })}
    >
      ↺ Reset demo
    </button>
  );
}
```

- [ ] **Step 3: Verify dev server compiles without errors**

Run: `npm run dev` in `steward-app/` and check terminal for TypeScript/module errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/demo/layout.tsx src/components/demo/DemoResetButton.tsx
git commit -m "feat: wrap demo layout in DemoStateProvider, add Reset button"
```

---

## Task 3: Update Overview page to derive KPIs from context

**Files:**
- Modify: `src/app/demo/page.tsx`

- [ ] **Step 1: Replace page.tsx with context-driven version**

Replace entire file:

```tsx
"use client";
import React, { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination } from "@/contexts/DenominationContext";
import { useDemoState, Tx, INITIAL_STATE } from "@/contexts/DemoStateContext";

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
            <div className="kpi-val" style={{ color: surplus >= 0 ? undefined : "var(--rust)" }}>
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
              {state.transactions.slice(0, 5).map((tx, i) => (
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

      {/* Add Transaction Modal */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/page.tsx
git commit -m "feat: wire demo overview KPIs to DemoStateContext"
```

---

## Task 4: Update Transactions page — context + delete + edit

**Files:**
- Modify: `src/app/demo/transactions/page.tsx`

- [ ] **Step 1: Replace with context-driven version with delete and edit**

Replace entire file:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/transactions/page.tsx
git commit -m "feat: wire demo transactions to context, add edit and delete"
```

---

## Task 5: Update Members page — context + delete

**Files:**
- Modify: `src/app/demo/members/page.tsx`

- [ ] **Step 1: Replace with context-driven version with delete**

Replace entire file. Key changes from current: replace `const [members, setMembers] = useState<Member[]>(INITIAL)` with `const { state, dispatch } = useDemoState()` and use `state.members`. Replace `setMembers` calls with `dispatch({ type: "ADD_MEMBER", member: ... })`. Add delete button per row.

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/members/page.tsx
git commit -m "feat: wire demo members to context, add delete"
```

---

## Task 6: Update Giving page — context + delete

**Files:**
- Modify: `src/app/demo/giving/page.tsx`

- [ ] **Step 1: Replace with context-driven version**

Replace entire file:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/giving/page.tsx
git commit -m "feat: wire demo giving to context, add delete"
```

---

## Task 7: Update Funds page — use context

**Files:**
- Modify: `src/app/demo/funds/page.tsx`

- [ ] **Step 1: Replace local useState with context dispatch**

Replace entire file:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/funds/page.tsx
git commit -m "feat: wire demo funds to context"
```

---

## Task 8: Wire Budget "+ Add line" button

**Files:**
- Modify: `src/app/demo/budget/page.tsx`

- [ ] **Step 1: Read current budget page**

Read `src/app/demo/budget/page.tsx` fully before editing.

- [ ] **Step 2: Add add-line modal**

In the budget page, wire the dead `+ Add line` button in the Topbar to open a modal. Add state: `const [showAdd, setShowAdd] = useState(false)` and `const [addForm, setAddForm] = useState({ category: "", budget: "" })`.

Change the Topbar `actions` prop button to: `<button className="btn btn-forest btn-sm" onClick={() => setShowAdd(true)}>+ Add line</button>`

Add add-line handler:
```tsx
const addLine = () => {
  const budget = parseFloat(addForm.budget) || 0;
  if (!addForm.category) return;
  setLines(prev => [...prev, { category: addForm.category, budget, actual: 0 }]);
  setAddForm({ category: "", budget: "" });
  setShowAdd(false);
};
```

Add modal JSX at end of component (before final `</>`):
```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/demo/budget/page.tsx
git commit -m "feat: wire demo budget add-line button"
```

---

## Task 9: Wire Payroll to context

**Files:**
- Modify: `src/app/demo/payroll/page.tsx`

- [ ] **Step 1: Add dispatch call after payroll runs**

Read the current file. In the `runPayroll` function (the one called after confirm), add a dispatch after the existing state updates:

```tsx
const { dispatch } = useDemoState();
// ... existing code ...
// At end of runPayroll:
dispatch({ type: "SET_PAYROLL_RAN" });
```

Add `import { useDemoState } from "@/contexts/DemoStateContext";` at top.

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/payroll/page.tsx
git commit -m "feat: wire demo payroll to context"
```

---

## Task 10: Reports page — live P&L from context + print

**Files:**
- Modify: `src/app/demo/reports/page.tsx`

- [ ] **Step 1: Replace with context-driven P&L generator**

Replace entire file:

```tsx
"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState } from "@/contexts/DemoStateContext";

const REPORT_DATE = "April 2026";
const CHURCH_NAME = "Grace Baptist Church";

export default function DemoReports() {
  const { state } = useDemoState();
  const [showPrint, setShowPrint] = useState(false);

  // Group transactions by category
  const incomeRows = state.transactions.filter(t => t.pence > 0);
  const expRows = state.transactions.filter(t => t.pence < 0);

  const groupBy = (txs: typeof incomeRows) => {
    const map: Record<string, number> = {};
    txs.forEach(t => {
      const cat = t.meta.split(" · ")[0];
      map[cat] = (map[cat] || 0) + t.pence;
    });
    return Object.entries(map).map(([cat, pence]) => ({ cat, amount: pence }));
  };

  const incomeGroups = groupBy(incomeRows);
  const expGroups = groupBy(expRows);
  const totalIncome = incomeRows.reduce((s, t) => s + t.pence, 0);
  const totalExp = expRows.reduce((s, t) => s + t.pence, 0);
  const surplus = totalIncome + totalExp;

  const fmt = (pence: number) => `£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: white; }
        }
        .print-area { display: none; }
      `}</style>

      <div className="no-print">
        <Topbar
          title="Reports"
          subtitle="AI-generated financial reports · HMRC ready"
          actions={
            <button className="btn btn-forest btn-sm" onClick={() => { setShowPrint(true); setTimeout(() => window.print(), 100); }}>
              ⬇ Download / Print
            </button>
          }
        />
      </div>

      <div className="content no-print">
        {/* Report list */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-head"><div className="card-title">Available reports</div></div>
          <table className="tbl">
            <thead><tr><th>Report</th><th>Period</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Income & Expenditure</strong></td>
                <td>{REPORT_DATE}</td>
                <td><div className="chip chip-sage">Ready</div></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => { setShowPrint(true); setTimeout(() => window.print(), 100); }}>⬇ Download</button></td>
              </tr>
              <tr>
                <td><strong>Gift Aid R68(i) claim</strong></td>
                <td>Tax year 2025–26</td>
                <td><div className="chip chip-sage">Ready</div></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => alert("In full Steward this generates a HMRC-ready R68(i) XML file.")}>⬇ Download</button></td>
              </tr>
              <tr>
                <td><strong>Annual fund summary</strong></td>
                <td>Apr 2025 – Mar 2026</td>
                <td><div className="chip chip-stone">Generating…</div></td>
                <td><button className="btn btn-outline btn-sm" disabled>⬇ Download</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Live P&L preview */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Income & Expenditure — {REPORT_DATE}</div>
              <div className="card-sub">{CHURCH_NAME} · Generated by Steward AI</div>
            </div>
            <button className="btn btn-outline btn-sm card-link" onClick={() => { setShowPrint(true); setTimeout(() => window.print(), 100); }}>
              Print →
            </button>
          </div>

          <table className="tbl" style={{ marginTop: "0.5rem" }}>
            <thead><tr><th>Income</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {incomeGroups.map(r => (
                <tr key={r.cat}><td>{r.cat}</td><td style={{ textAlign: "right" }}>{fmt(r.amount)}</td></tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                <td>Total Income</td><td style={{ textAlign: "right", color: "var(--sage)" }}>{fmt(totalIncome)}</td>
              </tr>
            </tbody>
          </table>

          <table className="tbl" style={{ marginTop: "1.5rem" }}>
            <thead><tr><th>Expenditure</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {expGroups.map(r => (
                <tr key={r.cat}><td>{r.cat}</td><td style={{ textAlign: "right" }}>{fmt(r.amount)}</td></tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                <td>Total Expenditure</td><td style={{ textAlign: "right", color: "var(--rust)" }}>{fmt(Math.abs(totalExp))}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: surplus >= 0 ? "var(--sage-bg)" : "var(--rust-bg)", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Net {surplus >= 0 ? "Surplus" : "Deficit"}</span>
            <span style={{ color: surplus >= 0 ? "var(--sage)" : "var(--rust)" }}>{surplus >= 0 ? "" : "-"}{fmt(surplus)}</span>
          </div>
        </div>
      </div>

      {/* Print-only full report */}
      <div className="print-area" style={{ padding: "2rem", fontFamily: "Georgia, serif", color: "#000" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{CHURCH_NAME}</h1>
        <h2 style={{ fontSize: "1rem", fontWeight: "normal", marginBottom: "1.5rem" }}>Income & Expenditure Statement — {REPORT_DATE}</h2>
        <p style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>Generated by Steward · {new Date().toLocaleDateString("en-GB")}</p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
          <thead><tr style={{ borderBottom: "2px solid #000" }}><th style={{ textAlign: "left", paddingBottom: "0.4rem" }}>Income</th><th style={{ textAlign: "right", paddingBottom: "0.4rem" }}>Amount</th></tr></thead>
          <tbody>
            {incomeGroups.map(r => (
              <tr key={r.cat} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: "0.35rem 0" }}>{r.cat}</td><td style={{ textAlign: "right" }}>{fmt(r.amount)}</td></tr>
            ))}
            <tr style={{ borderTop: "2px solid #000", fontWeight: 700 }}><td style={{ padding: "0.5rem 0" }}>Total Income</td><td style={{ textAlign: "right" }}>{fmt(totalIncome)}</td></tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
          <thead><tr style={{ borderBottom: "2px solid #000" }}><th style={{ textAlign: "left", paddingBottom: "0.4rem" }}>Expenditure</th><th style={{ textAlign: "right", paddingBottom: "0.4rem" }}>Amount</th></tr></thead>
          <tbody>
            {expGroups.map(r => (
              <tr key={r.cat} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: "0.35rem 0" }}>{r.cat}</td><td style={{ textAlign: "right" }}>{fmt(Math.abs(r.amount))}</td></tr>
            ))}
            <tr style={{ borderTop: "2px solid #000", fontWeight: 700 }}><td style={{ padding: "0.5rem 0" }}>Total Expenditure</td><td style={{ textAlign: "right" }}>{fmt(Math.abs(totalExp))}</td></tr>
          </tbody>
        </table>

        <div style={{ borderTop: "3px double #000", padding: "0.75rem 0", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem" }}>
          <span>Net {surplus >= 0 ? "Surplus" : "Deficit"}</span>
          <span>{surplus >= 0 ? "" : "-"}{fmt(surplus)}</span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/reports/page.tsx
git commit -m "feat: wire demo reports to context, add live P&L and print"
```

---

## Task 11: Final verification + push

- [ ] **Step 1: Smoke test in browser**

Visit `/demo` in browser. Confirm:
1. Add a transaction from Overview "+ Transaction" button → surplus KPI updates
2. Delete a transaction on `/demo/transactions` → KPIs on Overview update
3. Toggle Gift Aid on `/demo/giving` → reclaim estimate changes
4. Transfer funds on `/demo/funds` → bar widths update on Overview
5. Run payroll on `/demo/payroll` → "Payroll processed ✓" badge appears on Overview AI insights
6. Reports page shows real transaction data and print works
7. "↺ Reset demo" button restores all pages to seed data

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

Vercel auto-deploys from push.
