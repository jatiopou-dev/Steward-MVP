"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { createTransaction } from "@/app/actions/transactions";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/utils/domainOptions";

export default function NewTransactionPage() {
  const [type, setType] = useState<"income" | "expense">("income");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createTransaction(fd);
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
      setIsPending(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <Topbar
        title="Add transaction"
        subtitle="Record income or expenditure"
        actions={
          <Link href="/dashboard/transactions" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />

      <div className="content">
        <div className="card" style={{ maxWidth: 560 }}>
          <form onSubmit={handleSubmit}>
            {/* Type toggle */}
            <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setType("income")}
                className="btn"
                style={{
                  flex: 1,
                  background: type === "income" ? "var(--sage)" : "var(--parchment)",
                  color: type === "income" ? "var(--cream)" : "var(--stone)",
                  border: "1.5px solid",
                  borderColor: type === "income" ? "var(--sage)" : "var(--stone3)",
                  fontWeight: 600,
                }}
              >
                + Income
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className="btn"
                style={{
                  flex: 1,
                  background: type === "expense" ? "var(--rust)" : "var(--parchment)",
                  color: type === "expense" ? "var(--cream)" : "var(--stone)",
                  border: "1.5px solid",
                  borderColor: type === "expense" ? "var(--rust)" : "var(--stone3)",
                  fontWeight: 600,
                }}
              >
                − Expense
              </button>
            </div>
            <input type="hidden" name="type" value={type} />

            <div className="form-grp">
              <label>Description *</label>
              <input
                type="text"
                name="description"
                placeholder={type === "income" ? "e.g. Sunday morning offering" : "e.g. Electricity bill — April"}
                required
                maxLength={255}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-grp">
                <label>Amount (£) *</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-grp">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={today}
                  required
                />
              </div>
            </div>

            <div className="form-grp">
              <label>Category</label>
              <select name="category">
                <option value="">— Select category —</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-grp">
              <label>Notes</label>
              <input
                type="text"
                name="notes"
                placeholder="Optional — cheque number, reference, etc."
                maxLength={500}
              />
            </div>

            <div style={{ display: "flex", gap: ".8rem", marginTop: "1.8rem" }}>
              <button
                type="submit"
                className="btn btn-forest"
                style={{ flex: 1 }}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save transaction"}
              </button>
              <Link href="/dashboard/transactions" className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
