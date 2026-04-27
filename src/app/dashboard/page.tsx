import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import { termsMap, type Denomination } from "@/contexts/DenominationContext";

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(pence) / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function categoryIcon(category: string | null, isIncome: boolean): string {
  if (!category) return isIncome ? "🎁" : "💳";
  const map: Record<string, string> = {
    "Regular giving": "🎁", "Tithe & offering": "🙏", "Special offering": "✨",
    "Fundraising": "🎪", "Grant": "📋", "Hall hire": "🏛",
    "Wedding / funeral fees": "⛪", "Other income": "💰",
    "Payroll & wages": "💼", "Building & facilities": "🏢",
    "Ministry & outreach": "🌍", "Administration": "📁",
    "Worship & music": "🎵", "Utilities": "⚡", "Mission giving": "🌐",
    "Insurance": "🛡", "Community events": "🎉", "Other expense": "📤",
  };
  return map[category] ?? (isIncome ? "🎁" : "💳");
}

export default async function DashboardOverview() {
  const supabase = await createClient();

  // Fetch org name + denomination
  const { data: org } = await supabase
    .from("organizations")
    .select("name, denomination")
    .single();

  const denomination = (org?.denomination as Denomination) ?? "independent";
  const terms = termsMap[denomination];
  const orgName = org?.name ?? "Your Church";

  // Current month date range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0];
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Transactions this month
  const { data: monthTxs } = await supabase
    .from("transactions")
    .select("amount_pence, description, category, date")
    .gte("date", monthStart)
    .lt("date", monthEnd)
    .order("date", { ascending: false });

  const txsThisMonth = monthTxs ?? [];
  const incomePence = txsThisMonth
    .filter((t) => t.amount_pence > 0)
    .reduce((s, t) => s + t.amount_pence, 0);
  const expensePence = txsThisMonth
    .filter((t) => t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0);
  const netPence = incomePence - expensePence;

  // Recent 5 transactions (all time, newest first)
  const { data: recentTxs } = await supabase
    .from("transactions")
    .select("id, description, category, amount_pence, date")
    .order("date", { ascending: false })
    .limit(5);

  // Member stats
  const { data: memberStats } = await supabase
    .from("members")
    .select("id, is_gift_aid_eligible");

  const totalMembers = memberStats?.length ?? 0;
  const giftAidMembers = memberStats?.filter((m) => m.is_gift_aid_eligible).length ?? 0;
  // Potential Gift Aid claim this year (all income transactions × 25%, simplified)
  const giftAidClaimPence = Math.round(incomePence * 0.25 * (giftAidMembers / Math.max(totalMembers, 1)));

  return (
    <>
      <Topbar
        title="Overview"
        subtitle={`${orgName} · ${monthLabel}`}
        actions={
          <>
            <Link href="/dashboard/reports" className="btn btn-outline btn-sm">
              Generate report
            </Link>
            <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
              + Transaction
            </Link>
          </>
        }
      />

      <div className="content">
        {/* ── KPI row ── */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Income ({now.toLocaleDateString("en-GB", { month: "short" })})</div>
            <div className="kpi-val">{formatGBP(incomePence)}</div>
            <div className="kpi-meta neutral">
              {txsThisMonth.filter((t) => t.amount_pence > 0).length} transactions
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Expenditure ({now.toLocaleDateString("en-GB", { month: "short" })})</div>
            <div className="kpi-val">{formatGBP(expensePence)}</div>
            <div className="kpi-meta neutral">
              {txsThisMonth.filter((t) => t.amount_pence < 0).length} transactions
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Net {netPence >= 0 ? "surplus" : "deficit"}</div>
            <div className="kpi-val">{formatGBP(Math.abs(netPence))}</div>
            <div className={`kpi-meta ${netPence >= 0 ? "up" : "down"}`}>
              {netPence >= 0 ? "↑ Surplus" : "↓ Deficit"} this month
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">{terms.giving}</div>
            <div className="kpi-val">{totalMembers}</div>
            <div className="kpi-meta neutral">
              {totalMembers === 0 ? "No members yet" : `${giftAidMembers} Gift Aid eligible`}
            </div>
          </div>
        </div>

        <div className="two-col">
          {/* ── Recent transactions ── */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Recent transactions</div>
                <div className="card-sub">Latest activity · all funds</div>
              </div>
              <Link href="/dashboard/transactions" className="card-link">
                View all →
              </Link>
            </div>

            {(recentTxs ?? []).length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: ".6rem" }}>📭</div>
                <p style={{ fontSize: ".84rem", color: "var(--stone2)", marginBottom: "1rem" }}>
                  No transactions yet.
                </p>
                <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
                  + Add first transaction
                </Link>
              </div>
            ) : (
              <div className="tx-list">
                {(recentTxs ?? []).map((tx) => {
                  const isIncome = tx.amount_pence > 0;
                  return (
                    <div className="tx" key={tx.id}>
                      <div className={`tx-ico ${isIncome ? "inc" : "exp"}`}>
                        {categoryIcon(tx.category, isIncome)}
                      </div>
                      <div className="tx-body">
                        <div className="tx-name">{tx.description || "—"}</div>
                        <div className="tx-meta">
                          {tx.category ?? "Uncategorised"} · {formatDate(tx.date)}
                        </div>
                      </div>
                      <div className={`tx-amt ${isIncome ? "inc" : "exp"}`}>
                        {isIncome ? "+" : "−"}{formatGBP(tx.amount_pence)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {/* ── Quick stats ── */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Quick stats</div>
                <Link href="/dashboard/members" className="card-link">Members →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".83rem", color: "var(--ink2)" }}>Total members</span>
                  <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", color: "var(--forest)" }}>
                    {totalMembers}
                  </strong>
                </div>
                <div style={{ height: 1, background: "var(--parchment2)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".83rem", color: "var(--ink2)" }}>Gift Aid eligible</span>
                  <div className="chip chip-sage">{giftAidMembers}</div>
                </div>
                <div style={{ height: 1, background: "var(--parchment2)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".83rem", color: "var(--ink2)" }}>Est. Gift Aid claimable</span>
                  <strong style={{ fontSize: ".9rem", color: "var(--sage)" }}>
                    {formatGBP(giftAidClaimPence)}
                  </strong>
                </div>
                <div style={{ height: 1, background: "var(--parchment2)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".83rem", color: "var(--ink2)" }}>Transactions this month</span>
                  <strong style={{ fontSize: ".9rem", color: "var(--forest)" }}>
                    {txsThisMonth.length}
                  </strong>
                </div>
              </div>
            </div>

            {/* ── AI insight panel ── */}
            <div className="ai-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
                <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>
                  AI insights
                </div>
                <div className="ai-badge">✨ Live</div>
              </div>

              {txsThisMonth.length === 0 ? (
                <div className="ai-insight">
                  👋 Welcome to Steward! Add your first transaction to start
                  seeing AI-powered financial insights here.
                </div>
              ) : (
                <>
                  <div className="ai-insight">
                    {netPence >= 0
                      ? `📈 ${monthLabel}: income of ${formatGBP(incomePence)} against expenditure of ${formatGBP(expensePence)} — a net surplus of ${formatGBP(netPence)}.`
                      : `⚠️ ${monthLabel}: expenditure of ${formatGBP(expensePence)} exceeds income of ${formatGBP(incomePence)} — a deficit of ${formatGBP(Math.abs(netPence))}.`}
                  </div>
                  {giftAidMembers > 0 && (
                    <div className="ai-insight">
                      🎁 {giftAidMembers} member{giftAidMembers !== 1 ? "s have" : " has"} Gift Aid declarations on file.{" "}
                      <Link href="/dashboard/reports" style={{ color: "var(--gold3)", fontWeight: 600 }}>
                        Generate your HMRC claim →
                      </Link>
                    </div>
                  )}
                  {giftAidMembers === 0 && totalMembers > 0 && (
                    <div className="ai-insight">
                      💡 No Gift Aid declarations on file yet. Adding them to member records could unlock significant HMRC top-up on donations.
                    </div>
                  )}
                </>
              )}

              <Link
                href="/dashboard/ai"
                className="btn btn-sm"
                style={{
                  marginTop: ".8rem",
                  background: "rgba(255,255,255,.1)",
                  color: "var(--cream)",
                  border: "1px solid rgba(255,255,255,.2)",
                  display: "inline-block",
                  fontSize: ".75rem",
                }}
              >
                Ask your books →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
