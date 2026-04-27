"use client";

import React, { useState } from "react";
import Link from "next/link";
import { type Fund } from "@/app/actions/funds";
import { FUND_TYPES, FUND_STATUSES } from "@/utils/domainOptions";

type Props = {
  defaultValues?: Partial<Fund>;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export default function FundForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [selectedType, setSelectedType] = useState(defaultValues?.type ?? "unrestricted");

  const balanceDisplay = defaultValues?.balance_pence != null
    ? (Math.abs(defaultValues.balance_pence) / 100).toFixed(2)
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      await onSubmit(new FormData(e.currentTarget));
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
      setIsPending(false);
    }
  }

  const typeDescriptions: Record<string, string> = {
    unrestricted: "Can be spent on any church purpose at the trustees' discretion.",
    designated: "Set aside for a specific purpose by the trustees, but not legally restricted.",
    restricted: "Legally restricted by the donor or grant-maker — can only be spent as specified.",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grp">
        <label>Fund name *</label>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          placeholder="e.g. General fund, Building fund, Youth bursary"
        />
      </div>

      {/* Type selector */}
      <div className="form-grp">
        <label>Fund type *</label>
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", marginTop: ".2rem" }}>
          {FUND_TYPES.map((t) => (
            <label
              key={t.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: ".75rem",
                padding: ".9rem 1rem",
                borderRadius: 8,
                border: "1.5px solid",
                borderColor: selectedType === t.value ? "var(--forest)" : "var(--stone3)",
                background: selectedType === t.value ? "rgba(28,58,46,.04)" : "var(--parchment)",
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={selectedType === t.value}
                onChange={() => setSelectedType(t.value)}
                style={{ marginTop: 3, accentColor: "var(--forest)" }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: ".86rem", color: "var(--ink)", marginBottom: ".15rem" }}>
                  {t.label}
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--stone2)", lineHeight: 1.5 }}>
                  {typeDescriptions[t.value]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-grp">
          <label>Opening / current balance (£)</label>
          <input
            type="number"
            name="balance"
            step="0.01"
            min="0"
            defaultValue={balanceDisplay}
            placeholder="0.00"
          />
        </div>
        <div className="form-grp">
          <label>Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "active"}>
            {FUND_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-grp">
        <label>Description / purpose</label>
        <input
          type="text"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Optional — brief description of what this fund is for"
          maxLength={300}
        />
      </div>

      <div style={{ display: "flex", gap: ".8rem", marginTop: "1.8rem" }}>
        <button
          type="submit"
          className="btn btn-forest"
          style={{ flex: 1 }}
          disabled={isPending}
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href="/dashboard/funds" className="btn btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
