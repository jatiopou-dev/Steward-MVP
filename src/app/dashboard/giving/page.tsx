import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import { termsMap, type Denomination } from "@/contexts/DenominationContext";
import {
  getGiftAidExport,
  getGivingTransactions,
} from "@/app/actions/giving";

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function memberDisplayName(member: {
  title?: string | null;
  first_name: string;
  last_name: string;
} | null) {
  if (!member) return "Anonymous / unlinked";
  return [member.title, member.first_name, member.last_name].filter(Boolean).join(" ");
}

export default async function GivingPage() {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("denomination")
    .single();

  const terms = termsMap[(org?.denomination as Denomination) ?? "independent"];
  const giving = await getGivingTransactions();
  const giftAid = await getGiftAidExport();

  const now = new Date();
  const currentYear = now.getFullYear();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const monthlyTotal = giving
    .filter((tx) => new Date(tx.date) >= monthStart)
    .reduce((sum, tx) => sum + tx.amount_pence, 0);

  const ytdTotal = giving
    .filter((tx) => new Date(tx.date) >= ytdStart)
    .reduce((sum, tx) => sum + tx.amount_pence, 0);

  const activeGiverIds = new Set(
    giving
      .filter((tx) => tx.member_id && new Date(tx.date) >= ytdStart)
      .map((tx) => tx.member_id)
  );

  const byMember = new Map<
    string,
    {
      name: string;
      totalPence: number;
      lastGift: string;
      giftAidEligible: boolean;
      count: number;
    }
  >();

  for (const tx of giving) {
    const key = tx.member_id ?? "anonymous";
    const existing = byMember.get(key);
    const row = existing ?? {
      name: memberDisplayName(tx.members),
      totalPence: 0,
      lastGift: tx.date,
      giftAidEligible: tx.members?.is_gift_aid_eligible ?? false,
      count: 0,
    };
    row.totalPence += tx.amount_pence;
    row.count += 1;
    if (new Date(tx.date) > new Date(row.lastGift)) row.lastGift = tx.date;
    byMember.set(key, row);
  }

  const giverRows = Array.from(byMember.values()).sort(
    (a, b) => b.totalPence - a.totalPence
  );

  return (
    <>
      <Topbar 
        title={terms.giving}
        subtitle="Member giving · Gift Aid tracking"
        actions={
          <>
            <Link href="/dashboard/reports" className="btn btn-outline btn-sm">
              Gift Aid claim
            </Link>
            <Link href="/dashboard/giving/new" className="btn btn-forest btn-sm">
              + Record giving
            </Link>
          </>
        }
      />
      <div className="content">
        <div className="kpi-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="kpi"><div className="kpi-lbl">Active givers (YTD)</div><div className="kpi-val">{activeGiverIds.size}</div><div className="kpi-meta neutral">{currentYear}</div></div>
          <div className="kpi"><div className="kpi-lbl">Monthly giving total</div><div className="kpi-val">{formatGBP(monthlyTotal)}</div><div className="kpi-meta up">{giving.filter((tx) => new Date(tx.date) >= monthStart).length} gifts this month</div></div>
          <div className="kpi"><div className="kpi-lbl">Gift Aid claimable</div><div className="kpi-val">{formatGBP(giftAid.claimablePence)}</div><div className="kpi-meta up">{giftAid.claimableCount} eligible gifts</div></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Giving by member</div>
              <div className="card-sub">Year to date total: {formatGBP(ytdTotal)}</div>
            </div>
            <Link href="/dashboard/reports" className="card-link">Gift Aid claim →</Link>
          </div>

          {giverRows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎁</div>
              <h3 style={{ fontFamily: "var(--font-serif)", color: "var(--forest)", marginBottom: ".5rem" }}>
                No giving recorded yet
              </h3>
              <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1.5rem" }}>
                Record member donations here to track giving and generate Gift Aid claims.
              </p>
              <Link href="/dashboard/giving/new" className="btn btn-forest btn-sm">
                + Record first gift
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Gifts</th><th>Total given</th><th>Gift Aid</th><th>Last gift</th></tr></thead>
              <tbody>
                {giverRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                    <td><strong>{formatGBP(row.totalPence)}</strong></td>
                    <td>{row.giftAidEligible ? <div className="chip chip-sage">Eligible</div> : <div className="chip chip-stone">Not declared</div>}</td>
                    <td style={{ color: "var(--stone2)" }}>{formatDate(row.lastGift)}</td>
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
