import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import {
  createGivingRecord,
  getGivingMembers,
  memberDisplayName,
} from "@/app/actions/giving";

const GIVING_CATEGORIES = [
  "Regular giving",
  "Tithe & offering",
  "Special offering",
  "Fundraising",
  "Other income",
];

export default async function NewGivingPage() {
  const members = await getGivingMembers();
  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <Topbar
        title="Record giving"
        subtitle="Link donations to members for Gift Aid and statements"
        actions={
          <Link href="/dashboard/giving" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />

      <div className="content">
        <div className="card" style={{ maxWidth: 560 }}>
          <form action={createGivingRecord}>
            <div className="form-grp">
              <label>Member / donor</label>
              <select name="member_id">
                <option value="">Anonymous / not linked</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberDisplayName(member)}
                    {member.is_gift_aid_eligible ? " · Gift Aid" : ""}
                  </option>
                ))}
              </select>
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
                <input type="date" name="date" defaultValue={today} required />
              </div>
            </div>

            <div className="form-grp">
              <label>Giving category</label>
              <select name="category" defaultValue="Regular giving">
                {GIVING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grp">
              <label>Description</label>
              <input
                type="text"
                name="description"
                placeholder="Optional — auto-filled from member if left blank"
                maxLength={255}
              />
            </div>

            <div className="form-grp">
              <label>Notes</label>
              <input
                type="text"
                name="notes"
                placeholder="Optional — standing order ref, envelope no., etc."
                maxLength={500}
              />
            </div>

            {members.length === 0 && (
              <div
                style={{
                  background: "var(--gold-bg)",
                  border: "1px solid rgba(196,154,60,.25)",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1rem",
                  fontSize: ".82rem",
                  color: "var(--ink2)",
                  lineHeight: 1.6,
                }}
              >
                Add members first if you want gifts to appear on donor
                statements and Gift Aid claims. Anonymous gifts can still be
                recorded.
              </div>
            )}

            <div style={{ display: "flex", gap: ".8rem", marginTop: "1.8rem" }}>
              <button type="submit" className="btn btn-forest" style={{ flex: 1 }}>
                Save giving record
              </button>
              <Link href="/dashboard/giving" className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

