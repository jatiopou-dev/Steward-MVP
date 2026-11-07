import React from "react";
import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import { termsMap, type Denomination } from "@/lib/denominations";
import { getGiftAidExport } from "@/app/actions/giving";

function formatGBP(pence: number | bigint): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(pence) / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type MemberGivingRow = {
  member_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  is_gift_aid_eligible: boolean;
  total_pence: number;
  ytd_pence: number;
  month_pence: number;
  gift_count: number;
  last_gift_date: string | null;
};

export default async function GivingPage() {
  const supabase = await createClient();

  const [{ data: org }, { data: profile }] = await Promise.all([
    supabase.from("organizations").select("denomination").single(),
    supabase.from("profiles").select("org_id").single(),
  ]);

  const terms = termsMap[(org?.denomination as Denomination) ?? "independent"] ?? termsMap["independent"];

  const orgId = profile?.org_id as string | undefined;

  let giverRows: MemberGivingRow[] = [];
  if (orgId) {
    const { data, error } = await supabase.rpc("get_member_giving_summary", { p_org_id: orgId });
    if (error) console.error("get_member_giving_summary error:", error);
    giverRows = (data ?? []) as MemberGivingRow[];
  }

  const giftAid = await getGiftAidExport();

  const ytdTotal = giverRows.reduce((s, r) => s + Number(r.ytd_pence), 0);
  const monthTotal = giverRows.reduce((s, r) => s + Number(r.month_pence), 0);
  const activeGivers = giverRows.filter((r) => Number(r.ytd_pence) > 0).length;
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Topbar
        title={terms.giving}
        subtitle="Member giving · Gift Aid tracking"
        actions={
          <>
            <Link href="/dashboard/reports" className="btn btn-outline btn-sm">
              Reports & export
            </Link>
            <Link href="/dashboard/giving/new" className="btn btn-forest btn-sm">
                <Plus aria-hidden="true" />
                Record giving
            </Link>
          </>
        }
      />
      <div className="content">
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="kpi">
            <div className="kpi-lbl">Active givers (YTD)</div>
            <div className="kpi-val">{activeGivers}</div>
            <div className="kpi-meta neutral">{currentYear}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">This month total</div>
            <div className="kpi-val">{formatGBP(monthTotal)}</div>
            <div className="kpi-meta up">Across all funds</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Gift Aid claimable</div>
            <div className="kpi-val">{formatGBP(giftAid.claimablePence)}</div>
            <div className="kpi-meta up">{giftAid.claimableCount} eligible gifts</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Giving by member</div>
              <div className="card-sub">YTD total: {formatGBP(ytdTotal)} · {giverRows.length} members</div>
            </div>
            <Link href="/dashboard/reports" className="card-link">Export →</Link>
          </div>

          {giverRows.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                <HandCoins size={18} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3 className="empty-title">
                No giving recorded yet
              </h3>
              <p className="empty-body">
                Record member donations here to track giving and generate Gift Aid claims.
              </p>
              <Link href="/dashboard/giving/new" className="btn btn-forest btn-sm">
                <Plus aria-hidden="true" />
                Record first gift
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Gifts</th>
                  <th>This month</th>
                  <th>YTD total</th>
                  <th>Gift Aid</th>
                  <th>Last gift</th>
                </tr>
              </thead>
              <tbody>
                {giverRows.map((row) => {
                  const name = [row.title, row.first_name, row.last_name].filter(Boolean).join(" ");
                  return (
                    <tr key={row.member_id}>
                      <td style={{ fontWeight: 500 }}>{name}</td>
                      <td style={{ color: "var(--stone2)" }}>{Number(row.gift_count)}</td>
                      <td>{Number(row.month_pence) > 0 ? formatGBP(row.month_pence) : <span style={{ color: "var(--stone2)" }}>—</span>}</td>
                      <td><strong style={{ fontFamily: "var(--font-serif)" }}>{formatGBP(row.ytd_pence)}</strong></td>
                      <td>
                        {row.is_gift_aid_eligible
                          ? <div className="chip chip-sage">Eligible</div>
                          : <div className="chip chip-stone">No</div>}
                      </td>
                      <td style={{ color: "var(--stone2)", fontSize: ".82rem" }}>{formatDate(row.last_gift_date)}</td>
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
