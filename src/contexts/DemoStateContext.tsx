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
