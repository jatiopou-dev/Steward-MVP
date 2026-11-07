import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileSpreadsheet,
  Inbox,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { categoryIcon } from "@/lib/category-icons";
import Topbar, { type SealState } from "@/components/dashboard/Topbar";
import { CountUp, Meter, Reveal } from "@/components/motion";
import { createClient } from "@/utils/supabase/server";
import { termsMap, type Denomination } from "@/lib/denominations";

/**
 * Fund bars share one hue family and step down in lightness, so the
 * chart reads as a single ordered series rather than five competing
 * categories. The semantic colours stay reserved for money direction.
 */
const FUND_BAR_COLOURS = [
  "var(--a-500)",
  "var(--a-400)",
  "var(--seal)",
  "var(--a-200)",
  "var(--n-400)",
];

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(pence) / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function relatedFundName(funds: { name: string } | { name: string }[] | null | undefined): string {
  if (!funds) return "Unassigned";
  if (Array.isArray(funds)) return funds[0]?.name ?? "Unassigned";
  return funds.name ?? "Unassigned";
}

type MonthlySummary = {
  period_label: string;
  income_pence: number;
  expense_pence: number;
  tx_count: number;
};

export default async function DashboardOverview() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  const orgId = profile?.org_id as string | undefined;
  const now = new Date();

  const [
    { data: orgData },
    { data: rawMonthly },
    { data: recentTxs },
    { data: fundsData },
    { data: memberStats },
    { data: periodData },
  ] = await Promise.all([
    supabase.from("organizations").select("name, denomination").single(),
    orgId
      ? supabase.rpc("get_income_expense_summary", { p_org_id: orgId })
      : Promise.resolve({ data: [] as MonthlySummary[] }),
    supabase
      .from("transactions")
      .select("id, description, category, amount_pence, date, funds(name)")
      .order("date", { ascending: false })
      .limit(6),
    supabase
      .from("funds")
      .select("id, name, balance_pence")
      .eq("status", "active")
      .order("balance_pence", { ascending: false })
      .limit(5),
    supabase.from("members").select("id, is_gift_aid_eligible").limit(1000),
    // The seal reports the real reconciliation period, never a guess.
    orgId
      ? supabase
          .from("reconciliation_periods")
          .select("status, total_pence, donation_count")
          .eq("organisation_id", orgId)
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const org = orgData as { name?: string; denomination?: string } | null;
  const denomination = (org?.denomination ?? "independent") as Denomination;
  const terms = termsMap[denomination] ?? termsMap["independent"];
  const orgName = org?.name ?? "Your Church";

  const monthly = (rawMonthly ?? []) as MonthlySummary[];
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shortMonth = now.toLocaleDateString("en-GB", { month: "short" });

  const currentMonth = monthly[0] ?? { income_pence: 0, expense_pence: 0, tx_count: 0 };
  const incomePence = Number(currentMonth.income_pence);
  const expensePence = Number(currentMonth.expense_pence);
  const netPence = incomePence - expensePence;
  const txCount = Number(currentMonth.tx_count);

  const funds = fundsData ?? [];
  const totalFundsPence = funds.reduce((s, f) => s + (f.balance_pence ?? 0), 0);

  const memberList = memberStats ?? [];
  const totalMembers = memberList.length;
  const giftAidMembers = memberList.filter((m) => m.is_gift_aid_eligible).length;
  const giftAidClaimPence = Math.round(
    incomePence * 0.25 * (totalMembers > 0 ? giftAidMembers / totalMembers : 0)
  );

  const period = periodData as
    | { status: string; total_pence: number; donation_count: number }
    | null;
  const sealState: SealState =
    period?.status === "closed" ? "verified" : incomePence > 0 ? "pending" : "none";
  const sealFraction =
    incomePence > 0 && period ? Math.min(1, Number(period.total_pence) / incomePence) : 0;

  const recent = (recentTxs ?? []) as Array<{
    id: string;
    description: string | null;
    category: string | null;
    amount_pence: number;
    date: string;
    funds: { name: string } | { name: string }[] | null;
  }>;

  const hasActivity = incomePence !== 0 || expensePence !== 0 || recent.length > 0;

  return (
    <>
      <Topbar
        title="Overview"
        subtitle={`${orgName} · ${monthLabel}`}
        seal={{ state: sealState, fraction: sealFraction }}
        actions={
          <>
            <Link href="/dashboard/reports" className="btn btn-outline btn-sm">
              <FileSpreadsheet aria-hidden="true" />
              Reports
            </Link>
            <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
              <Plus aria-hidden="true" />
              Transaction
            </Link>
          </>
        }
      />

      <div className="content">
        {/* ── The four figures a treasurer checks first. Each names its
             period, so no number is ambiguous out of context. ── */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-lbl">Income · {shortMonth}</div>
            <div className="kpi-val">
              <CountUp value={incomePence} format="gbp" />
            </div>
            <div className="kpi-meta neutral">
              {txCount} {txCount === 1 ? "transaction" : "transactions"}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-lbl">Expenditure · {shortMonth}</div>
            <div className="kpi-val">
              <CountUp value={expensePence} format="gbp" />
            </div>
            <div className="kpi-meta neutral">Paid out this month</div>
          </div>

          <div className="kpi">
            <div className="kpi-lbl">
              Net {netPence >= 0 ? "surplus" : "deficit"} · {shortMonth}
            </div>
            <div className={`kpi-val ${netPence >= 0 ? "num-pos" : "num-neg"}`}>
              <CountUp value={Math.abs(netPence)} format="gbp" />
            </div>
            <div className={`kpi-meta ${netPence >= 0 ? "up" : "down"}`}>
              {netPence >= 0 ? "Income exceeds spend" : "Spend exceeds income"}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-lbl">On the roll</div>
            <div className="kpi-val">{totalMembers}</div>
            <div className="kpi-meta neutral">
              {totalMembers === 0 ? "No members yet" : `${giftAidMembers} Gift Aid eligible`}
            </div>
          </div>
        </div>

        <div className="two-col">
          {/* ── Recent transactions ── */}
          <Reveal className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Recent transactions</h2>
                <div className="card-sub">Latest activity across all funds</div>
              </div>
              <Link href="/dashboard/transactions" className="card-link">
                View all
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <Inbox size={18} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="empty-title">No transactions yet</div>
                <p className="empty-body">
                  Record your first offering or payment, or import a bank
                  statement to populate the ledger in one pass.
                </p>
                <div className="empty-actions">
                  <Link href="/dashboard/transactions/new" className="btn btn-forest btn-sm">
                    <Plus aria-hidden="true" />
                    Add transaction
                  </Link>
                  <Link href="/dashboard/transactions/import" className="btn btn-outline btn-sm">
                    Import statement
                  </Link>
                </div>
              </div>
            ) : (
              <div className="tx-list">
                {recent.map((tx) => {
                  const isIncome = tx.amount_pence > 0;
                  const Icon = categoryIcon(tx.category, isIncome);
                  return (
                    <Link href={`/dashboard/transactions/${tx.id}`} className="tx" key={tx.id}>
                      <span className="avatar" aria-hidden="true">
                        <Icon size={15} strokeWidth={1.8} />
                      </span>
                      <span className="tx-body">
                        <span className="tx-name">{tx.description ?? "Untitled"}</span>
                        <span className="tx-meta">
                          {relatedFundName(tx.funds)} · {tx.category ?? "Uncategorised"} ·{" "}
                          {formatDate(tx.date)}
                        </span>
                      </span>
                      {/* The sign is spelled out as well as coloured, so
                          direction survives greyscale and colour blindness. */}
                      <span className={`num tx-amt ${isIncome ? "num-pos" : "num-neg"}`}>
                        {isIncome ? "+" : "−"}
                        {formatGBP(tx.amount_pence)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Reveal>

          <div className="stack">
            {/* ── Fund allocation ── */}
            <Reveal className="card" delay={0.04}>
              <div className="card-head">
                <div>
                  <h2 className="card-title">Fund allocation</h2>
                  <div className="card-sub">
                    {totalFundsPence > 0
                      ? `${formatGBP(totalFundsPence)} across ${funds.length} ${funds.length === 1 ? "fund" : "funds"}`
                      : "Restricted and unrestricted balances"}
                  </div>
                </div>
                <Link href="/dashboard/funds" className="card-link">
                  Manage
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>

              {funds.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    <Wallet size={18} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div className="empty-title">No fund accounts</div>
                  <p className="empty-body">
                    Funds keep restricted giving separate from general income —
                    required for most denominational returns.
                  </p>
                  <Link href="/dashboard/funds/new" className="btn btn-outline btn-sm">
                    <Plus aria-hidden="true" />
                    Create fund
                  </Link>
                </div>
              ) : (
                <div className="fund-rows">
                  {funds.map((fund, i) => {
                    const fraction =
                      totalFundsPence > 0 ? (fund.balance_pence ?? 0) / totalFundsPence : 0;
                    return (
                      <div key={fund.id}>
                        <div className="fund-head">
                          <span className="fund-nm">{fund.name}</span>
                          <span className="fund-vl">{formatGBP(fund.balance_pence ?? 0)}</span>
                        </div>
                        <Meter
                          fraction={fraction}
                          color={FUND_BAR_COLOURS[i % FUND_BAR_COLOURS.length]}
                          label={`${fund.name} share of total funds`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Reveal>

            {/* ── Gift Aid position ── */}
            <Reveal className="card" delay={0.04}>
              <div className="card-head">
                <div>
                  <h2 className="card-title">Gift Aid position</h2>
                  <div className="card-sub">Claimable against {shortMonth} giving</div>
                </div>
                <Link href="/dashboard/gift-aid" className="card-link">
                  Claim
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>

              <dl className="stat-list">
                <div className="stat-row">
                  <dt>Declarations on file</dt>
                  <dd className="num">{giftAidMembers}</dd>
                </div>
                <div className="stat-row">
                  <dt>Share of the roll</dt>
                  <dd className="num">
                    {totalMembers > 0
                      ? `${Math.round((giftAidMembers / totalMembers) * 100)}%`
                      : "—"}
                  </dd>
                </div>
                <div className="stat-row">
                  <dt>Estimated claim</dt>
                  <dd className="num num-pos">{formatGBP(giftAidClaimPence)}</dd>
                </div>
                <div className="stat-row">
                  <dt>{terms.giving} recorded</dt>
                  <dd className="num">{txCount}</dd>
                </div>
              </dl>
            </Reveal>

            {/* ── Insights. A quiet advisor: states the position in plain
                 terms and offers the next action. ── */}
            <Reveal className="ai-card" delay={0.04}>
              <div className="card-head">
                <h2 className="card-title">Insights</h2>
                <span className="ai-badge">
                  <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
                  Live
                </span>
              </div>

              {!hasActivity ? (
                <p className="ai-insight">
                  Nothing to read yet. Once a few transactions are in, this
                  panel reports the month&apos;s position, flags categories
                  running ahead of budget, and tells you what is left to
                  reconcile.
                </p>
              ) : (
                <>
                  <p className="ai-insight">
                    <strong>{monthLabel}:</strong>{" "}
                    {netPence >= 0
                      ? `income of ${formatGBP(incomePence)} against expenditure of ${formatGBP(expensePence)} — a surplus of ${formatGBP(netPence)}.`
                      : `expenditure of ${formatGBP(expensePence)} against income of ${formatGBP(incomePence)} — a deficit of ${formatGBP(Math.abs(netPence))}.`}
                  </p>

                  {sealState === "pending" && (
                    <p className="ai-insight">
                      <strong>This period is not closed.</strong>{" "}
                      {period
                        ? `${period.donation_count} donations totalling ${formatGBP(Number(period.total_pence))} are matched so far.`
                        : "No donations have been matched to the bank feed yet."}{" "}
                      <Link href="/dashboard/reconciliation" className="card-link">
                        Reconcile {shortMonth}
                      </Link>
                    </p>
                  )}

                  {giftAidMembers > 0 && (
                    <p className="ai-insight">
                      <strong>
                        {giftAidMembers} {giftAidMembers === 1 ? "member has" : "members have"}
                      </strong>{" "}
                      Gift Aid declarations on file, worth about{" "}
                      {formatGBP(giftAidClaimPence)} on this month&apos;s giving.{" "}
                      <Link href="/dashboard/reports" className="card-link">
                        Generate HMRC claim
                      </Link>
                    </p>
                  )}
                </>
              )}

              <div className="card-foot">
                <Link href="/dashboard/ai" className="btn btn-outline btn-sm">
                  <Sparkles aria-hidden="true" />
                  Ask your books
                </Link>
                <Link href="/dashboard/budget" className="btn btn-ghost btn-sm">
                  <CalendarCheck aria-hidden="true" />
                  Budget
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
