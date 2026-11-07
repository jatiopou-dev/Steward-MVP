"use client";

import { BarChart3, FolderOpen, HandCoins, Landmark, type LucideIcon } from "lucide-react";
import React, { useState } from "react";
import type { MonthSummary, MemberGivingRow, FundRow } from "./page";

type Props = {
  orgName: string;
  monthly: MonthSummary[];
  givers: MemberGivingRow[];
  funds: FundRow[];
  giftAidCsv: string;
  claimablePence: number;
  claimableCount: number;
};

function fmt(pence: number | bigint): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(pence) / 100);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildMonthlyCsv(monthly: MonthSummary[]): string {
  const rows = monthly.map((m) =>
    `"${m.period_label}",${(Number(m.income_pence) / 100).toFixed(2)},${(Number(m.expense_pence) / 100).toFixed(2)},${(Number(m.income_pence - m.expense_pence) / 100).toFixed(2)},${m.tx_count}`
  );
  return ["Period,Income (£),Expenditure (£),Net (£),Transactions", ...rows].join("\n");
}

function buildGiversCsv(givers: MemberGivingRow[]): string {
  const rows = givers.map((g) => {
    const name = [g.title, g.first_name, g.last_name].filter(Boolean).join(" ");
    return `"${name}",${g.gift_count},${(Number(g.ytd_pence) / 100).toFixed(2)},${(Number(g.total_pence) / 100).toFixed(2)},${g.is_gift_aid_eligible ? "Yes" : "No"},"${g.last_gift_date ? new Date(g.last_gift_date).toLocaleDateString("en-GB") : ""}"`;
  });
  return ["Name,Gifts (YTD),YTD Total (£),All-time Total (£),Gift Aid,Last Gift", ...rows].join("\n");
}

function buildFundsCsv(funds: FundRow[]): string {
  const rows = funds.map((f) =>
    `"${f.name}","${f.type}",${(f.balance_pence / 100).toFixed(2)},"${f.description ?? ""}"`
  );
  return ["Fund Name,Type,Balance (£),Description", ...rows].join("\n");
}

type ReportId = "monthly" | "givers" | "funds" | "gift-aid";

const REPORTS: { id: ReportId; label: string; description: string; icon: LucideIcon }[] = [
  { id: "monthly", label: "Income & Expenditure", description: "Monthly breakdown of income and expenditure", icon: BarChart3 },
  { id: "givers", label: "Giving by Member", description: "Year-to-date giving per member with Gift Aid status", icon: HandCoins },
  { id: "funds", label: "Fund Balances", description: "Current balance of all fund accounts", icon: FolderOpen },
  { id: "gift-aid", label: "Gift Aid Claim (HMRC)", description: "HMRC Charities Online CSV for R68 submission", icon: Landmark },
];

export default function ReportsClient({ orgName, monthly, givers, funds, giftAidCsv, claimablePence, claimableCount }: Props) {
  const [active, setActive] = useState<ReportId>("monthly");

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  function handleDownload() {
    const ts = new Date().toISOString().slice(0, 10);
    if (active === "monthly") downloadCsv(buildMonthlyCsv(monthly), `${orgName}_income_expenditure_${ts}.csv`);
    if (active === "givers") downloadCsv(buildGiversCsv(givers), `${orgName}_giving_by_member_${ts}.csv`);
    if (active === "funds") downloadCsv(buildFundsCsv(funds), `${orgName}_fund_balances_${ts}.csv`);
    if (active === "gift-aid") downloadCsv(giftAidCsv, `HMRC_Gift_Aid_Claim_${ts}.csv`);
  }

  function handlePrint() {
    window.print();
  }

  const currentReport = REPORTS.find((r) => r.id === active)!;

  return (
    <div className="content">
      <div className="two-col" style={{ alignItems: "flex-start" }}>
        {/* ── Left: report picker ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".8rem",
                padding: ".9rem 1rem",
                cursor: "pointer",
                border: active === r.id ? "2px solid var(--forest)" : "2px solid transparent",
                background: active === r.id ? "var(--parchment2)" : "var(--parchment)",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span className="avatar" aria-hidden="true">
                {React.createElement(r.icon, { size: 15, strokeWidth: 1.8 })}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: ".88rem", color: "var(--forest)" }}>{r.label}</div>
                <div style={{ fontSize: ".76rem", color: "var(--stone2)", marginTop: ".15rem" }}>{r.description}</div>
              </div>
            </button>
          ))}

          <div style={{ display: "flex", gap: ".5rem", marginTop: ".4rem" }}>
            <button className="btn btn-forest" style={{ flex: 1 }} onClick={handleDownload}>
              ⬇ Download CSV
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={handlePrint}>
              Print
            </button>
          </div>
        </div>

        {/* ── Right: preview ── */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <div>
              <div className="card-title">{currentReport.label}</div>
              <div className="card-sub">{orgName} · As at {today}</div>
            </div>
          </div>

          {active === "monthly" && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Period</th>
                  <th style={{ textAlign: "right" }}>Income</th>
                  <th style={{ textAlign: "right" }}>Expenditure</th>
                  <th style={{ textAlign: "right" }}>Net</th>
                  <th style={{ textAlign: "right" }}>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--stone2)", padding: "2rem" }}>No data</td></tr>
                ) : monthly.map((m) => {
                  const net = Number(m.income_pence) - Number(m.expense_pence);
                  return (
                    <tr key={m.period_label}>
                      <td style={{ fontWeight: 500 }}>{m.period_label}</td>
                      <td style={{ textAlign: "right", color: "var(--sage)" }}>{fmt(m.income_pence)}</td>
                      <td style={{ textAlign: "right", color: "var(--rust)" }}>{fmt(m.expense_pence)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: net >= 0 ? "var(--sage)" : "var(--rust)" }}>
                        {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--stone2)", fontSize: ".82rem" }}>{m.tx_count}</td>
                    </tr>
                  );
                })}
              </tbody>
              {monthly.length > 0 && (() => {
                const totIncome = monthly.reduce((s, m) => s + Number(m.income_pence), 0);
                const totExpense = monthly.reduce((s, m) => s + Number(m.expense_pence), 0);
                const totNet = totIncome - totExpense;
                return (
                  <tfoot>
                    <tr style={{ background: "var(--parchment2)", fontWeight: 700 }}>
                      <td>Total</td>
                      <td style={{ textAlign: "right", color: "var(--sage)" }}>{fmt(totIncome)}</td>
                      <td style={{ textAlign: "right", color: "var(--rust)" }}>{fmt(totExpense)}</td>
                      <td style={{ textAlign: "right", color: totNet >= 0 ? "var(--sage)" : "var(--rust)" }}>
                        {totNet >= 0 ? "+" : "−"}{fmt(Math.abs(totNet))}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--stone2)" }}>
                        {monthly.reduce((s, m) => s + Number(m.tx_count), 0)}
                      </td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          )}

          {active === "givers" && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ textAlign: "right" }}>Gifts</th>
                  <th style={{ textAlign: "right" }}>YTD</th>
                  <th style={{ textAlign: "right" }}>All time</th>
                  <th>Gift Aid</th>
                  <th>Last gift</th>
                </tr>
              </thead>
              <tbody>
                {givers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--stone2)", padding: "2rem" }}>No giving records</td></tr>
                ) : givers.map((g) => {
                  const name = [g.title, g.first_name, g.last_name].filter(Boolean).join(" ");
                  return (
                    <tr key={g.member_id}>
                      <td style={{ fontWeight: 500 }}>{name}</td>
                      <td style={{ textAlign: "right", color: "var(--stone2)" }}>{Number(g.gift_count)}</td>
                      <td style={{ textAlign: "right" }}><strong>{fmt(g.ytd_pence)}</strong></td>
                      <td style={{ textAlign: "right", color: "var(--stone2)", fontSize: ".82rem" }}>{fmt(g.total_pence)}</td>
                      <td>{g.is_gift_aid_eligible ? <div className="chip chip-sage">Yes</div> : <div className="chip chip-stone">No</div>}</td>
                      <td style={{ color: "var(--stone2)", fontSize: ".82rem" }}>
                        {g.last_gift_date ? new Date(g.last_gift_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {active === "funds" && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {funds.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--stone2)", padding: "2rem" }}>No funds</td></tr>
                ) : funds.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.name}</td>
                    <td><div className="chip chip-stone" style={{ textTransform: "capitalize" }}>{f.type}</div></td>
                    <td style={{ textAlign: "right" }}><strong style={{ fontFamily: "var(--font-serif)" }}>{fmt(f.balance_pence)}</strong></td>
                    <td style={{ fontSize: ".78rem", color: "var(--stone2)" }}>{f.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              {funds.length > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--parchment2)", fontWeight: 700 }}>
                    <td colSpan={2}>Total</td>
                    <td style={{ textAlign: "right" }}>{fmt(funds.reduce((s, f) => s + f.balance_pence, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {active === "gift-aid" && (
            <div>
              <div style={{ padding: "1.2rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="kpi" style={{ flex: 1 }}>
                    <div className="kpi-lbl">Eligible gifts</div>
                    <div className="kpi-val">{claimableCount}</div>
                    <div className="kpi-meta up">Unclaimed declarations</div>
                  </div>
                  <div className="kpi" style={{ flex: 1 }}>
                    <div className="kpi-lbl">Claimable from HMRC</div>
                    <div className="kpi-val">{fmt(claimablePence)}</div>
                    <div className="kpi-meta up">25% top-up on eligible gifts</div>
                  </div>
                </div>
                <div style={{ background: "var(--parchment2)", borderRadius: 8, padding: "1rem", fontSize: ".82rem", color: "var(--ink2)", lineHeight: 1.6 }}>
                  <strong>How to submit:</strong>
                  <ol style={{ marginTop: ".4rem", paddingLeft: "1.2rem" }}>
                    <li>Click <strong>Download CSV</strong> to get the HMRC-formatted file</li>
                    <li>Log in to <strong>HMRC Charities Online</strong></li>
                    <li>Submit under <em>Claim Gift Aid</em> → <em>Upload a schedule</em></li>
                    <li>HMRC will process and pay within 5 working days</li>
                  </ol>
                </div>
                <div style={{ background: "var(--parchment2)", borderRadius: 8, padding: ".8rem 1rem", fontSize: ".78rem", color: "var(--stone2)" }}>
                  CSV preview (first 3 rows):
                  <pre style={{ marginTop: ".4rem", overflow: "auto", fontSize: ".72rem", lineHeight: 1.4 }}>
                    {giftAidCsv.split("\n").slice(0, 4).join("\n")}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
