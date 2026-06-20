"use client";

import React, { useState, useTransition } from "react";
import { Lock, LockOpen, CheckCircle2, Clock, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { closePeriod } from "@/app/actions/v2/reconciliation";
import type { ReconciliationPeriod, AppealSummary } from "@/lib/types/v2";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CloseFormState {
  year: string;
  month: string;
  error: string | null;
  success: boolean;
}

interface ReconciliationClientProps {
  orgId: string;
  initialPeriods: ReconciliationPeriod[];
}

export default function ReconciliationClient({ orgId, initialPeriods }: ReconciliationClientProps) {
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>(initialPeriods);
  const [form, setForm] = useState<CloseFormState>({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    error: null,
    success: false,
  });
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MONTH_NAMES[i + 1] }));

  const selectedYear = parseInt(form.year);
  const selectedMonth = parseInt(form.month);
  const alreadyClosed = periods.some(
    (p) => p.year === selectedYear && p.month === selectedMonth && p.status === "closed"
  );

  const handleClose = () => {
    setForm((f) => ({ ...f, error: null, success: false }));
    startTransition(async () => {
      const result = await closePeriod({ organisation_id: orgId, year: selectedYear, month: selectedMonth });
      if ("error" in result) {
        setForm((f) => ({ ...f, error: result.error ?? "Unknown error" }));
      } else {
        setForm((f) => ({ ...f, success: true, error: null }));
        // Prepend to periods list
        setPeriods((prev) => {
          const existing = prev.findIndex(
            (p) => p.year === result.data.year && p.month === result.data.month
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = result.data;
            return updated;
          }
          return [result.data, ...prev];
        });
      }
    });
  };

  const closedCount = periods.filter((p) => p.status === "closed").length;
  const lastClosed = periods.find((p) => p.status === "closed");

  return (
    <div className="content">
      <div style={{ maxWidth: 900 }}>
        {/* KPI row */}
        <div className="kpi-row" style={{ marginBottom: "1.4rem" }}>
          <div className="kpi">
            <div className="kpi-lbl">Periods closed</div>
            <div className="kpi-val">{closedCount}</div>
            <div className="kpi-meta neutral">across all years</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Last closed</div>
            <div className="kpi-val" style={{ fontSize: "1.3rem" }}>
              {lastClosed ? `${MONTH_NAMES[lastClosed.month]} ${lastClosed.year}` : "—"}
            </div>
            <div className="kpi-meta neutral">
              {lastClosed ? formatDate(lastClosed.closed_at) : "No periods closed yet"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total reconciled</div>
            <div className="kpi-val" style={{ fontSize: "1.3rem" }}>
              {formatGBP(periods.filter((p) => p.status === "closed").reduce((s, p) => s + p.total_pence, 0))}
            </div>
            <div className="kpi-meta up">↑ across closed periods</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Donations reconciled</div>
            <div className="kpi-val">
              {periods.filter((p) => p.status === "closed").reduce((s, p) => s + p.donation_count, 0)}
            </div>
            <div className="kpi-meta neutral">total records locked</div>
          </div>
        </div>

        <div className="two-col" style={{ gap: "1.2rem" }}>
          {/* Close period form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                Close a period
              </CardTitle>
              <CardDescription>
                Locks all donations for the selected month. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink2)", letterSpacing: ".02em" }}>
                    Year
                  </label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      borderColor: "var(--stone3)",
                      background: "var(--parchment)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-sans)",
                    }}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value, error: null, success: false }))}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink2)", letterSpacing: ".02em" }}>
                    Month
                  </label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      borderColor: "var(--stone3)",
                      background: "var(--parchment)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-sans)",
                    }}
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value, error: null, success: false }))}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {alreadyClosed && !form.success && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "var(--gold-bg)", color: "var(--gold2)" }}
                >
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  {MONTH_NAMES[selectedMonth]} {selectedYear} is already closed
                </div>
              )}

              {form.error && (
                <div
                  className="rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "var(--rust-bg)", color: "var(--rust)" }}
                >
                  {form.error}
                </div>
              )}

              {form.success && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "var(--sage-bg)", color: "var(--sage)" }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {MONTH_NAMES[selectedMonth]} {selectedYear} closed and blockchain anchor submitted
                </div>
              )}

              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "var(--parchment2)", color: "var(--stone)" }}
              >
                <strong style={{ color: "var(--ink2)" }}>What happens when you close a period:</strong>
                <ul className="mt-1.5 space-y-1 list-disc list-inside">
                  <li>All donations in this month are locked to "reconciled" status</li>
                  <li>New imports targeting this month will be rejected</li>
                  <li>A blockchain anchor hash is submitted to Polygon/Base</li>
                  <li>Period stats are frozen (donation count, total, per-appeal summary)</li>
                </ul>
              </div>

              <Button
                onClick={handleClose}
                disabled={isPending || alreadyClosed}
                style={{ background: "var(--forest)", color: "var(--cream)" }}
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isPending
                  ? "Closing period…"
                  : `Close ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
              </Button>
            </CardContent>
          </Card>

          {/* Period history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                Period history
              </CardTitle>
              <CardDescription>{periods.length} period{periods.length !== 1 ? "s" : ""} on record</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {periods.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm" style={{ color: "var(--stone2)" }}>
                    No periods closed yet. Use the form to close your first month.
                  </p>
                </div>
              ) : (
                <div>
                  {periods.map((period) => {
                    const key = `${period.year}-${period.month}`;
                    const isExpanded = expandedPeriod === key;
                    const appeals = period.summary_by_appeal as AppealSummary[] | null;

                    return (
                      <div key={key} className="border-b last:border-b-0">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                          onClick={() => setExpandedPeriod(isExpanded ? null : key)}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: period.status === "closed" ? "var(--sage-bg)" : "var(--parchment2)",
                            }}
                          >
                            {period.status === "closed" ? (
                              <Lock className="w-3.5 h-3.5" style={{ color: "var(--sage)" }} />
                            ) : (
                              <LockOpen className="w-3.5 h-3.5" style={{ color: "var(--stone)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                                {MONTH_NAMES[period.month]} {period.year}
                              </span>
                              <Badge
                                variant={period.status === "closed" ? "default" : "secondary"}
                                className="text-xs"
                                style={
                                  period.status === "closed"
                                    ? { background: "var(--sage-bg)", color: "var(--sage)", border: "none" }
                                    : {}
                                }
                              >
                                {period.status}
                              </Badge>
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: "var(--stone2)" }}>
                              {period.donation_count} donations · {formatGBP(period.total_pence)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "var(--stone2)" }}>
                              {formatDate(period.closed_at)}
                            </span>
                            <ChevronRight
                              className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")}
                              style={{ color: "var(--stone3)" }}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1" style={{ background: "var(--parchment)" }}>
                            {appeals && appeals.length > 0 ? (
                              <div>
                                <div
                                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                                  style={{ color: "var(--stone2)" }}
                                >
                                  By appeal
                                </div>
                                <div className="space-y-1.5">
                                  {appeals.map((a) => (
                                    <div key={a.appeal_id} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                                          style={{ background: "var(--parchment2)", color: "var(--ink3)" }}
                                        >
                                          {a.appeal_code}
                                        </span>
                                        <span className="text-sm" style={{ color: "var(--ink2)" }}>
                                          {a.appeal_name}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-semibold" style={{ color: "var(--forest)" }}>
                                          {formatGBP(a.total_pence)}
                                        </div>
                                        <div className="text-xs" style={{ color: "var(--stone2)" }}>
                                          {a.count} donations
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: "var(--stone2)" }}>
                                No appeal breakdown available
                              </p>
                            )}
                            {period.anchor_tx_hash && (
                              <div
                                className="mt-3 rounded px-2 py-1.5 text-xs font-mono"
                                style={{ background: "var(--ink)", color: "var(--sage3)" }}
                              >
                                ⛓ {period.anchor_tx_hash}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
