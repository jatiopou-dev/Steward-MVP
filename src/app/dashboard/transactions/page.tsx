import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getTransactions, deleteTransaction } from "@/app/actions/transactions";

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(Math.abs(pence) / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function categoryIcon(category: string | null, isIncome: boolean): string {
  if (!category) return isIncome ? "🎁" : "💳";
  const map: Record<string, string> = {
    "Regular giving": "🎁",
    "Tithe & offering": "🙏",
    "Special offering": "✨",
    "Fundraising": "🎪",
    "Grant": "📋",
    "Hall hire": "🏛",
    "Wedding / funeral fees": "⛪",
    "Other income": "💰",
    "Payroll & wages": "💼",
    "Building & facilities": "🏢",
    "Ministry & outreach": "🌍",
    "Administration": "📁",
    "Worship & music": "🎵",
    "Utilities": "⚡",
    "Mission giving": "🌐",
    "Insurance": "🛡",
    "Community events": "🎉",
    "Other expense": "📤",
  };
  return map[category] ?? (isIncome ? "🎁" : "💳");
}

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  const totalIncomePence = transactions
    .filter((tx) => tx.amount_pence > 0)
    .reduce((sum, tx) => sum + tx.amount_pence, 0);

  const totalExpensePence = transactions
    .filter((tx) => tx.amount_pence < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount_pence), 0);

  const netPence = totalIncomePence - totalExpensePence;

  return (
    <>
      <Topbar
        title="Transactions"
        subtitle="All income and expenditure"
        actions={
          <>
            <Link href="/dashboard/transactions/import" className="btn btn-outline btn-sm">
              ⬇ Import CSV
            </Link>
            <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
              + Add transaction
            </Link>
          </>
        }
      />

      <div className="content">
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="kpi">
            <div className="kpi-lbl">Total income</div>
            <div className="kpi-val">{formatGBP(totalIncomePence)}</div>
            <div className="kpi-meta up">{transactions.filter((t) => t.amount_pence > 0).length} transactions</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total expenditure</div>
            <div className="kpi-val">{formatGBP(totalExpensePence)}</div>
            <div className="kpi-meta down">{transactions.filter((t) => t.amount_pence < 0).length} transactions</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Net balance</div>
            <div className="kpi-val">{formatGBP(Math.abs(netPence))}</div>
            <div className={`kpi-meta ${netPence >= 0 ? "up" : "down"}`}>
              {netPence >= 0 ? "Surplus" : "Deficit"}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">All transactions</div>
            <div style={{ fontSize: ".76rem", color: "var(--stone2)" }}>
              {transactions.length} total
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--forest)", marginBottom: ".5rem" }}>
                No transactions yet
              </h3>
              <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1.5rem" }}>
                Add your first transaction or import a bank statement CSV.
              </p>
              <div style={{ display: "flex", gap: ".8rem", justifyContent: "center" }}>
                <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
                  + Add transaction
                </Link>
                <Link href="/dashboard/transactions/import" className="btn btn-outline btn-sm">
                  Import CSV
                </Link>
              </div>
            </div>
          ) : (
            <div className="tx-list">
              {transactions.map((tx) => {
                const isIncome = tx.amount_pence > 0;
                return (
                  <div className="tx" key={tx.id} style={{ borderBottom: "1px solid var(--parchment2)", paddingBottom: ".65rem" }}>
                    <div className={`tx-ico ${isIncome ? "inc" : "exp"}`}>
                      {categoryIcon(tx.category, isIncome)}
                    </div>
                    <div className="tx-body">
                      <div className="tx-name">{tx.description || "—"}</div>
                      <div className="tx-meta">
                        {tx.category && (
                          <span style={{ marginRight: ".5rem" }}>{tx.category}</span>
                        )}
                        · {formatDate(tx.date)}
                        {tx.is_gift_aid_claimed && (
                          <span className="chip chip-sage" style={{ marginLeft: ".5rem" }}>Gift Aid</span>
                        )}
                      </div>
                    </div>
                    <div className={`tx-amt ${isIncome ? "inc" : "exp"}`}>
                      {isIncome ? "+" : "−"}{formatGBP(tx.amount_pence)}
                    </div>
                    <div style={{ display: "flex", gap: ".4rem", marginLeft: ".8rem" }}>
                      <Link
                        href={`/dashboard/transactions/${tx.id}/edit`}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: ".3rem .65rem", fontSize: ".72rem" }}
                      >
                        Edit
                      </Link>
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={tx.id} />
                        <button
                          type="submit"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: ".3rem .65rem", fontSize: ".72rem", color: "var(--rust)" }}
                          onClick={(e) => {
                            if (!confirm("Delete this transaction? This cannot be undone.")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
