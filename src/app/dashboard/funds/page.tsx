import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getFunds, deleteFund, FUND_TYPES, FUND_STATUSES, type Fund } from "@/app/actions/funds";

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function typeChip(type: Fund["type"]) {
  const t = FUND_TYPES.find((x) => x.value === type);
  return <div className={`chip ${t?.chip ?? "chip-stone"}`}>{t?.label ?? type}</div>;
}

function statusChip(status: Fund["status"]) {
  const s = FUND_STATUSES.find((x) => x.value === status);
  return <div className={`chip ${s?.chip ?? "chip-stone"}`}>{s?.label ?? status}</div>;
}

const BAR_COLOURS = ["var(--forest)", "var(--gold)", "var(--sage)", "var(--stone2)", "var(--rust)"];

export default async function FundsPage() {
  const funds = await getFunds();

  const totalPence = funds.reduce((s, f) => s + f.balance_pence, 0);
  const activeFunds = funds.filter((f) => f.status !== "closed");
  const restrictedTotal = funds
    .filter((f) => f.type === "restricted")
    .reduce((s, f) => s + f.balance_pence, 0);

  return (
    <>
      <Topbar
        title="Fund accounts"
        subtitle="Restricted, unrestricted and designated funds"
        actions={
          <Link href="/dashboard/funds/new" className="btn btn-forest btn-sm">
            + New fund
          </Link>
        }
      />

      <div className="content">
        {/* ── Summary KPIs ── */}
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="kpi">
            <div className="kpi-lbl">Total across all funds</div>
            <div className="kpi-val">{formatGBP(totalPence)}</div>
            <div className="kpi-meta neutral">{activeFunds.length} active fund{activeFunds.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Restricted funds</div>
            <div className="kpi-val">{formatGBP(restrictedTotal)}</div>
            <div className="kpi-meta" style={{ color: "var(--gold)" }}>
              {funds.filter((f) => f.type === "restricted").length} fund{funds.filter((f) => f.type === "restricted").length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Unrestricted / Designated</div>
            <div className="kpi-val">{formatGBP(totalPence - restrictedTotal)}</div>
            <div className="kpi-meta up">Trustees&apos; discretion</div>
          </div>
        </div>

        {funds.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📂</div>
            <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--forest)", marginBottom: ".5rem" }}>
              No fund accounts yet
            </h3>
            <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1.5rem" }}>
              Set up your fund accounts to track restricted, unrestricted, and
              designated funds — required for charity reporting.
            </p>
            <Link href="/dashboard/funds/new" className="btn btn-forest btn-sm">
              + Create first fund
            </Link>
          </div>
        ) : (
          <>
            {/* ── Allocation bars ── */}
            {totalPence > 0 && (
              <div className="card" style={{ marginBottom: "1.2rem" }}>
                <div className="card-head">
                  <div className="card-title">Fund allocation</div>
                </div>
                <div className="fund-rows">
                  {funds.slice(0, 5).map((fund, i) => {
                    const pct = totalPence > 0
                      ? Math.round((fund.balance_pence / totalPence) * 100)
                      : 0;
                    return (
                      <div key={fund.id}>
                        <div className="fund-head">
                          <span className="fund-nm">{fund.name}</span>
                          <span className="fund-vl">{formatGBP(fund.balance_pence)} · {pct}%</span>
                        </div>
                        <div className="fund-bar">
                          <div
                            className="fund-fill"
                            style={{ width: `${pct}%`, background: BAR_COLOURS[i % BAR_COLOURS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Full table ── */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">All fund balances</div>
                <div style={{ fontSize: ".76rem", color: "var(--stone2)" }}>
                  {funds.length} fund{funds.length !== 1 ? "s" : ""}
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fund name</th>
                    <th>Type</th>
                    <th>Balance</th>
                    <th>% of total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund) => {
                    const pct = totalPence > 0
                      ? Math.round((fund.balance_pence / totalPence) * 100)
                      : 0;
                    return (
                      <tr key={fund.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{fund.name}</div>
                          {fund.description && (
                            <div style={{ fontSize: ".72rem", color: "var(--stone2)", marginTop: ".15rem" }}>
                              {fund.description}
                            </div>
                          )}
                        </td>
                        <td>{typeChip(fund.type)}</td>
                        <td>
                          <strong style={{ fontFamily: "var(--font-serif)" }}>
                            {formatGBP(fund.balance_pence)}
                          </strong>
                        </td>
                        <td style={{ color: "var(--stone2)", fontSize: ".82rem" }}>{pct}%</td>
                        <td>{statusChip(fund.status)}</td>
                        <td>
                          <div style={{ display: "flex", gap: ".4rem" }}>
                            <Link
                              href={`/dashboard/funds/${fund.id}/edit`}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: ".3rem .65rem", fontSize: ".72rem" }}
                            >
                              Edit
                            </Link>
                            <form action={deleteFund}>
                              <input type="hidden" name="id" value={fund.id} />
                              <button
                                type="submit"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: ".3rem .65rem", fontSize: ".72rem", color: "var(--rust)" }}
                                onClick={(e) => {
                                  if (!confirm(`Delete "${fund.name}"? This cannot be undone.`)) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
