"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MEMBER_TITLES, MEMBER_STATUSES, type Member } from "@/app/actions/members";

type Props = {
  defaultValues?: Partial<Member>;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export default function MemberForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [giftAid, setGiftAid] = useState(
    defaultValues?.is_gift_aid_eligible ?? false
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      await onSubmit(fd);
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Personal details ── */}
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--stone2)",
          marginBottom: "1rem",
        }}
      >
        Personal details
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "1rem" }}>
        <div className="form-grp">
          <label>Title</label>
          <select name="title" defaultValue={defaultValues?.title ?? ""}>
            <option value="">—</option>
            {MEMBER_TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-grp">
          <label>First name *</label>
          <input
            type="text"
            name="first_name"
            defaultValue={defaultValues?.first_name ?? ""}
            required
            placeholder="e.g. Sarah"
          />
        </div>
        <div className="form-grp">
          <label>Last name *</label>
          <input
            type="text"
            name="last_name"
            defaultValue={defaultValues?.last_name ?? ""}
            required
            placeholder="e.g. Anderson"
          />
        </div>
      </div>

      {/* ── Contact ── */}
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--stone2)",
          margin: "1.4rem 0 1rem",
        }}
      >
        Contact
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-grp">
          <label>Email</label>
          <input
            type="email"
            name="email"
            defaultValue={defaultValues?.email ?? ""}
            placeholder="sarah@example.com"
          />
        </div>
        <div className="form-grp">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            placeholder="07700 000000"
          />
        </div>
        <div className="form-grp">
          <label>Address</label>
          <input
            type="text"
            name="address_line1"
            defaultValue={defaultValues?.address_line1 ?? ""}
            placeholder="12 Grace Way"
          />
        </div>
        <div className="form-grp">
          <label>Postcode</label>
          <input
            type="text"
            name="postcode"
            defaultValue={defaultValues?.postcode ?? ""}
            placeholder="SW1A 1AA"
            maxLength={10}
          />
        </div>
      </div>

      {/* ── Membership ── */}
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--stone2)",
          margin: "1.4rem 0 1rem",
        }}
      >
        Membership
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <div className="form-grp">
          <label>Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "active"}>
            {MEMBER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="form-grp">
          <label>Joined date</label>
          <input
            type="date"
            name="joined_date"
            defaultValue={defaultValues?.joined_date?.slice(0, 10) ?? ""}
          />
        </div>
        <div className="form-grp">
          <label>Baptism date</label>
          <input
            type="date"
            name="baptism_date"
            defaultValue={defaultValues?.baptism_date?.slice(0, 10) ?? ""}
          />
        </div>
      </div>

      {/* ── Gift Aid ── */}
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--stone2)",
          margin: "1.4rem 0 1rem",
        }}
      >
        Gift Aid (HMRC)
      </div>

      <div
        style={{
          background: giftAid ? "var(--sage-bg)" : "var(--parchment2)",
          border: `1.5px solid ${giftAid ? "rgba(74,140,111,.3)" : "var(--stone3)"}`,
          borderRadius: 8,
          padding: "1rem 1.2rem",
          marginBottom: "1rem",
          transition: "all .2s",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".75rem",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: ".88rem",
            color: giftAid ? "var(--forest)" : "var(--ink2)",
          }}
        >
          <input
            type="checkbox"
            name="is_gift_aid_eligible"
            value="true"
            checked={giftAid}
            onChange={(e) => setGiftAid(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--sage)" }}
          />
          Gift Aid declaration on file
        </label>
        <p style={{ fontSize: ".75rem", color: "var(--stone2)", marginTop: ".35rem", marginLeft: "1.7rem" }}>
          Member has signed a Gift Aid declaration, allowing the church to
          claim 25p per £1 donated from HMRC.
        </p>
      </div>
      {/* Hidden field to pass false when unchecked */}
      {!giftAid && <input type="hidden" name="is_gift_aid_eligible" value="false" />}

      {giftAid && (
        <div className="form-grp" style={{ maxWidth: 220 }}>
          <label>Declaration date</label>
          <input
            type="date"
            name="gift_aid_declaration_date"
            defaultValue={
              defaultValues?.gift_aid_declaration_date?.slice(0, 10) ?? ""
            }
          />
        </div>
      )}
      {!giftAid && (
        <input type="hidden" name="gift_aid_declaration_date" value="" />
      )}

      {/* ── Notes ── */}
      <div className="form-grp" style={{ marginTop: "1rem" }}>
        <label>Notes</label>
        <input
          type="text"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Optional — any relevant notes"
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
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href="/dashboard/members" className="btn btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
