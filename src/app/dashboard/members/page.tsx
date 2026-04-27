import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getMembers, deleteMember, type Member } from "@/app/actions/members";

function initials(m: Member): string {
  return `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase();
}

function fullName(m: Member): string {
  const parts = [m.title, m.first_name, m.last_name].filter(Boolean);
  return parts.join(" ");
}

const AVATAR_COLOURS = [
  { bg: "var(--sage-bg)", color: "var(--sage)" },
  { bg: "var(--gold-bg)", color: "var(--gold)" },
  { bg: "var(--rust-bg)", color: "var(--rust)" },
  { bg: "rgba(28,58,46,.1)", color: "var(--forest)" },
];

function avatarStyle(m: Member) {
  const idx =
    (m.first_name.charCodeAt(0) + m.last_name.charCodeAt(0)) %
    AVATAR_COLOURS.length;
  return AVATAR_COLOURS[idx];
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "chip-sage" },
    inactive: { label: "Inactive", cls: "chip-stone" },
    transfer_in: { label: "Transfer in", cls: "chip-gold" },
    transfer_out: { label: "Transfer out", cls: "chip-gold" },
    deceased: { label: "Deceased", cls: "chip-stone" },
  };
  const s = map[status] ?? { label: status, cls: "chip-stone" };
  return <div className={`chip ${s.cls}`}>{s.label}</div>;
}

export default async function MembersPage() {
  const members = await getMembers();

  const total = members.length;
  const active = members.filter((m) => m.status === "active").length;
  const giftAidEligible = members.filter((m) => m.is_gift_aid_eligible).length;
  const baptisedYtd = members.filter((m) => {
    if (!m.baptism_date) return false;
    return new Date(m.baptism_date).getFullYear() === new Date().getFullYear();
  }).length;

  return (
    <>
      <Topbar
        title="Membership"
        subtitle={`${total} member${total !== 1 ? "s" : ""} · ${active} active`}
        actions={
          <Link href="/dashboard/members/new" className="btn btn-forest btn-sm">
            + Add member
          </Link>
        }
      />

      <div className="content">
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Total members</div>
            <div className="kpi-val">{total}</div>
            <div className="kpi-meta neutral">{active} active</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Gift Aid eligible</div>
            <div className="kpi-val">{giftAidEligible}</div>
            <div className="kpi-meta up">Declarations on file</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Baptisms (YTD)</div>
            <div className="kpi-val">{baptisedYtd}</div>
            <div className="kpi-meta neutral">{new Date().getFullYear()}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Transfers pending</div>
            <div className="kpi-val">
              {members.filter(
                (m) => m.status === "transfer_in" || m.status === "transfer_out"
              ).length}
            </div>
            <div className="kpi-meta neutral">In or out</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Member directory</div>
            <div style={{ fontSize: ".76rem", color: "var(--stone2)" }}>
              {total} total
            </div>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👥</div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "var(--forest)",
                  marginBottom: ".5rem",
                }}
              >
                No members yet
              </h3>
              <p
                style={{
                  fontSize: ".84rem",
                  color: "var(--stone2)",
                  marginBottom: "1.5rem",
                }}
              >
                Add your congregation members to track giving, Gift Aid, and
                attendance.
              </p>
              <Link
                href="/dashboard/members/new"
                className="btn btn-forest btn-sm"
              >
                + Add first member
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Gift Aid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const av = avatarStyle(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".6rem",
                          }}
                        >
                          <div
                            className="avatar"
                            style={{ background: av.bg, color: av.color }}
                          >
                            {initials(m)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {fullName(m)}
                            </div>
                            {m.postcode && (
                              <div
                                style={{
                                  fontSize: ".72rem",
                                  color: "var(--stone2)",
                                }}
                              >
                                {m.postcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: ".78rem", color: "var(--stone2)" }}>
                        {m.email && <div>{m.email}</div>}
                        {m.phone && <div>{m.phone}</div>}
                        {!m.email && !m.phone && "—"}
                      </td>
                      <td>
                        <StatusChip status={m.status} />
                      </td>
                      <td style={{ color: "var(--stone2)", fontSize: ".82rem" }}>
                        {m.joined_date
                          ? new Date(m.joined_date).getFullYear()
                          : "—"}
                      </td>
                      <td>
                        {m.is_gift_aid_eligible ? (
                          <div className="chip chip-sage">Eligible</div>
                        ) : (
                          <div className="chip chip-stone">Not declared</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: ".4rem" }}>
                          <Link
                            href={`/dashboard/members/${m.id}/edit`}
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: ".3rem .65rem",
                              fontSize: ".72rem",
                            }}
                          >
                            Edit
                          </Link>
                          <form action={deleteMember}>
                            <input type="hidden" name="id" value={m.id} />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-sm"
                              style={{
                                padding: ".3rem .65rem",
                                fontSize: ".72rem",
                                color: "var(--rust)",
                              }}
                              onClick={(e) => {
                                if (
                                  !confirm(
                                    `Remove ${fullName(m)} from the directory? This cannot be undone.`
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
