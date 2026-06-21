import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import { listDonors } from "@/app/actions/v2/donors";
import type { Donor } from "@/lib/types/v2";

const AVATAR_COLOURS = [
  { bg: "var(--sage-bg)", color: "var(--sage)" },
  { bg: "var(--gold-bg)", color: "var(--gold)" },
  { bg: "var(--rust-bg)", color: "var(--rust)" },
  { bg: "rgba(28,58,46,.1)", color: "var(--forest)" },
];

function avatarColour(name: string) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % AVATAR_COLOURS.length;
  return AVATAR_COLOURS[idx];
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function DonorsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/auth");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) redirect("/onboarding");

  const result = await listDonors(membership.organisation_id);
  const donors: Donor[] = "data" in result ? (result.data ?? []) : [];

  const total = donors.length;
  const active = donors.filter((d) => d.status === "active").length;
  const giftAidEligible = donors.filter((d) => d.gift_aid_eligible).length;
  const withEmail = donors.filter((d) => d.email).length;

  return (
    <>
      <Topbar
        title="Donors"
        subtitle={`${total} donor${total !== 1 ? "s" : ""} · ${active} active`}
        actions={
          <Link href="/dashboard/donors/new" className="btn btn-forest btn-sm">
            + Add donor
          </Link>
        }
      />

      <div className="content">
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Total donors</div>
            <div className="kpi-val">{total}</div>
            <div className="kpi-meta neutral">{active} active</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Gift Aid eligible</div>
            <div className="kpi-val">{giftAidEligible}</div>
            <div className="kpi-meta up">Declarations on file</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">With email</div>
            <div className="kpi-val">{withEmail}</div>
            <div className="kpi-meta neutral">Contact on file</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Archived</div>
            <div className="kpi-val">{total - active}</div>
            <div className="kpi-meta neutral">Inactive donors</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Donor directory</div>
              <div className="card-sub">{total} total</div>
            </div>
          </div>

          {donors.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👤</div>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--forest)", marginBottom: ".5rem" }}>
                No donors yet
              </h3>
              <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1.5rem" }}>
                Donors are individuals or organisations whose donations are tracked in the finance system.
                They are linked to donations and Gift Aid declarations.
              </p>
              <Link href="/dashboard/donors/new" className="btn btn-forest btn-sm">
                + Add first donor
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Gift Aid</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => {
                  const av = avatarColour(d.display_name);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                          <div className="avatar" style={{ background: av.bg, color: av.color }}>
                            {initials(d.display_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{d.display_name}</div>
                            {d.external_reference && (
                              <div style={{ fontSize: ".72rem", color: "var(--stone2)" }}>
                                Ref: {d.external_reference}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: ".82rem", color: "var(--stone2)" }}>
                        {d.email ?? "—"}
                      </td>
                      <td>
                        {d.gift_aid_eligible ? (
                          <div className="chip chip-sage">Eligible</div>
                        ) : (
                          <div className="chip chip-stone">Not declared</div>
                        )}
                      </td>
                      <td>
                        <div className={`chip ${d.status === "active" ? "chip-sage" : "chip-stone"}`}>
                          {d.status === "active" ? "Active" : "Archived"}
                        </div>
                      </td>
                      <td style={{ fontSize: ".82rem", color: "var(--stone2)" }}>
                        {formatDate(d.created_at)}
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
