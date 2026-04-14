import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getTransactions } from "@/app/actions/transactions";

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <>
      <Topbar 
        title="Transactions"
        subtitle="All income and expenditure · AI-categorised"
        actions={
          <>
            <Link href="/dashboard/transactions/import" className="btn btn-outline btn-sm">⬇ Import CSV</Link>
            <button className="btn btn-forest btn-sm">+ Add</button>
          </>
        }
      />
      <div className="content">
        <div className="card">
          <div className="tx-list">
            {transactions.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--fg-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📭</div>
                <h3>No transactions yet</h3>
                <p style={{ marginTop: "0.5rem" }}>You haven't imported any bank statements.</p>
                <Link href="/dashboard/transactions/import" className="btn btn-forest" style={{ marginTop: "1.5rem" }}>
                  Import your first CSV
                </Link>
              </div>
            ) : (
              transactions.map((tx: any) => {
                const isIncome = tx.amount_pence > 0;
                const amountFormatted = `£${(Math.abs(tx.amount_pence) / 100).toFixed(2)}`;
                
                return (
                  <div className="tx" key={tx.id}>
                    <div className={`tx-ico ${isIncome ? 'inc' : 'exp'}`}>
                      {isIncome ? '🎁' : '🏢'}
                    </div>
                    <div className="tx-body">
                      <div className="tx-name">Transaction ID: {tx.id.split('-')[0]}</div>
                      <div className="tx-meta">
                        {tx.profiles?.full_name ? `Associated via AI to: ${tx.profiles.full_name}` : 'Uncategorised or General'}
                        {' · ' + new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`tx-amt ${isIncome ? 'inc' : 'exp'}`}>
                      {isIncome ? '+' : '-'}{amountFormatted}
                    </div>
                    {tx.is_gift_aid_claimed && <div className="chip chip-sage" style={{ marginLeft: "1rem" }}>Gift Aid</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
