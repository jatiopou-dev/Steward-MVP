import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import { listAppeals } from "@/app/actions/v2/appeals";
import type { Appeal } from "@/lib/types/v2";

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AppealsPage() {
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

  const result = await listAppeals(membership.organisation_id);
  const appeals: Appeal[] = "data" in result ? (result.data ?? []) : [];

  const total = appeals.length;
  const active = appeals.filter((a) => a.status === "active").length;
  const archived = appeals.filter((a) => a.status === "archived").length;

  return (
    <>
      <Topbar
        title="Appeals"
        subtitle={`${total} appeal${total !== 1 ? "s" : ""} · ${active} active`}
        actions={
          <Link href="/dashboard/appeals/new" className="btn btn-forest btn-sm">
            + Create appeal
          </Link>
        }
      />

      <div className="content">
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kpi">
            <div className="kpi-lbl">Total appeals</div>
            <div className="kpi-val">{total}</div>
            <div className="kpi-meta neutral">All time</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Active</div>
            <div className="kpi-val">{active}</div>
            <div className="kpi-meta up">Currently open</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Archived</div>
            <div className="kpi-val">{archived}</div>
            <div className="kpi-meta neutral">Closed appeals</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Appeal register</div>
              <div className="card-sub">
                Appeals are fundraising campaigns — donations can be tagged to an appeal
              </div>
            </div>
          </div>

          {appeals.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📣</div>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--forest)", marginBottom: ".5rem" }}>
                No appeals yet
              </h3>
              <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1.5rem" }}>
                Appeals let you track donations against specific fundraising campaigns — a
                building fund drive, a mission trip, or an emergency relief collection.
              </p>
              <Link href="/dashboard/appeals/new" className="btn btn-forest btn-sm">
                + Create first appeal
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {appeals.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <code style={{
                        fontSize: ".78rem",
                        background: "var(--parchment2)",
                        padding: ".15rem .4rem",
                        borderRadius: 4,
                        fontFamily: "monospace",
                      }}>
                        {a.code}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--stone2)", maxWidth: 260 }}>
                      {a.description ?? "—"}
                    </td>
                    <td>
                      <div className={`chip ${a.status === "active" ? "chip-sage" : "chip-stone"}`}>
                        {a.status === "active" ? "Active" : "Archived"}
                      </div>
                    </td>
                    <td style={{ fontSize: ".82rem", color: "var(--stone2)" }}>
                      {formatDate(a.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
