"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2, XCircle, Download, Plus, AlertTriangle, FileText, ChevronRight, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { listDeclarations, createClaim, submitClaim } from "@/app/actions/v2/giftAid";
import type { GiftAidDeclaration, GiftAidClaim, SubmitClaimResult } from "@/lib/types/v2";

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface GiftAidClientProps {
  orgId: string;
  initialDeclarations: GiftAidDeclaration[];
  initialClaims: GiftAidClaim[];
  eligibleDonorCount: number;
}

export default function GiftAidClient({
  orgId,
  initialDeclarations,
  initialClaims,
  eligibleDonorCount,
}: GiftAidClientProps) {
  const [declarations] = useState<GiftAidDeclaration[]>(initialDeclarations);
  const [claims, setClaims] = useState<GiftAidClaim[]>(initialClaims);
  const [submitResult, setSubmitResult] = useState<SubmitClaimResult | null>(null);

  // Create claim form
  const [claimFrom, setClaimFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [claimTo, setClaimTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [createdClaim, setCreatedClaim] = useState<GiftAidClaim | null>(null);
  const [isPendingCreate, startCreate] = useTransition();

  // Submit claim
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPendingSubmit, startSubmit] = useTransition();

  const activeDeclarations = declarations.filter((d) => !d.revoked_at);
  const revokedDeclarations = declarations.filter((d) => d.revoked_at);

  const handleCreateClaim = () => {
    setClaimError(null);
    startCreate(async () => {
      const result = await createClaim({ organisation_id: orgId, claim_period_from: claimFrom, claim_period_to: claimTo });
      if ("error" in result) {
        setClaimError(result.error ?? "Unknown error");
      } else {
        setCreatedClaim(result.data);
        setClaims((prev) => [result.data, ...prev]);
      }
    });
  };

  const handleSubmitClaim = (claimId: string) => {
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitClaim({ organisation_id: orgId, claim_id: claimId });
      if ("error" in result) {
        setSubmitError(result.error ?? "Unknown error");
      } else {
        setSubmitResult(result.data);
        setClaims((prev) =>
          prev.map((c) => (c.id === claimId ? result.data.claim : c))
        );
        downloadCsv(
          result.data.csv,
          `steward-gift-aid-${claimFrom}-to-${claimTo}.csv`
        );
      }
    });
  };

  const totalClaimable = claims
    .filter((c) => c.status === "submitted")
    .reduce((s, c) => s + c.total_gift_aid_pence, 0);

  const draftClaims = claims.filter((c) => c.status === "draft");
  const submittedClaims = claims.filter((c) => c.status === "submitted");

  return (
    <div className="content">
      <div style={{ maxWidth: 960 }}>
        {/* KPI row */}
        <div className="kpi-row" style={{ marginBottom: "1.4rem" }}>
          <div className="kpi">
            <div className="kpi-lbl">Active declarations</div>
            <div className="kpi-val">{activeDeclarations.length}</div>
            <div className="kpi-meta neutral">{eligibleDonorCount} eligible donors</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Claims submitted</div>
            <div className="kpi-val">{submittedClaims.length}</div>
            <div className="kpi-meta neutral">{draftClaims.length} in draft</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total Gift Aid claimed</div>
            <div className="kpi-val" style={{ fontSize: "1.4rem" }}>{formatGBP(totalClaimable)}</div>
            <div className="kpi-meta up">↑ from HMRC submissions</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Rate</div>
            <div className="kpi-val" style={{ fontSize: "1.6rem" }}>25%</div>
            <div className="kpi-meta neutral">on eligible donations</div>
          </div>
        </div>

        <Tabs defaultValue="claims">
          <TabsList className="mb-4">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="declarations">
              Declarations ({activeDeclarations.length})
            </TabsTrigger>
          </TabsList>

          {/* ── CLAIMS TAB ── */}
          <TabsContent value="claims">
            <div className="two-col" style={{ gap: "1.2rem" }}>
              {/* Create claim */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                    Create a claim
                  </CardTitle>
                  <CardDescription>
                    Scans all eligible donations in the date range and builds an HMRC claim batch
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink2)" }}>
                        From
                      </label>
                      <input
                        type="date"
                        value={claimFrom}
                        onChange={(e) => { setClaimFrom(e.target.value); setClaimError(null); setCreatedClaim(null); }}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--stone3)", background: "var(--parchment)", color: "var(--ink)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink2)" }}>
                        To
                      </label>
                      <input
                        type="date"
                        value={claimTo}
                        onChange={(e) => { setClaimTo(e.target.value); setClaimError(null); setCreatedClaim(null); }}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--stone3)", background: "var(--parchment)", color: "var(--ink)" }}
                      />
                    </div>
                  </div>

                  <div
                    className="rounded-lg p-3 text-xs space-y-1"
                    style={{ background: "var(--parchment2)", color: "var(--stone)" }}
                  >
                    <p><strong style={{ color: "var(--ink2)" }}>Claim rules:</strong></p>
                    <p>• Only donors with Gift Aid declarations covering the donation date</p>
                    <p>• Donations already in a submitted claim are excluded</p>
                    <p>• Claim is created as a draft — review before submitting to HMRC</p>
                  </div>

                  {claimError && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                      style={{ background: "var(--rust-bg)", color: "var(--rust)" }}
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {claimError}
                    </div>
                  )}

                  {createdClaim && !claimError && (
                    <div
                      className="rounded-lg p-3 space-y-2"
                      style={{ background: "var(--sage-bg)", borderColor: "var(--sage3)" }}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--sage)" }}>
                        <CheckCircle2 className="w-4 h-4" />
                        Draft claim created
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span style={{ color: "var(--stone)" }}>Donations</span>
                          <div className="font-bold text-base" style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                            {createdClaim.donation_count}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--stone)" }}>Gift Aid value</span>
                          <div className="font-bold text-base" style={{ fontFamily: "var(--font-serif)", color: "var(--sage)" }}>
                            {formatGBP(createdClaim.total_gift_aid_pence)}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "var(--stone)" }}>
                        Find this claim in the list below to submit it to HMRC
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateClaim}
                    disabled={isPendingCreate || !claimFrom || !claimTo}
                    style={{ background: "var(--forest)", color: "var(--cream)" }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isPendingCreate ? "Building claim…" : "Create draft claim"}
                  </Button>
                </CardContent>
              </Card>

              {/* Claims list */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                    Claim history
                  </CardTitle>
                  <CardDescription>{claims.length} claim{claims.length !== 1 ? "s" : ""} on record</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {claims.length === 0 ? (
                    <div className="py-10 text-center px-4">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm" style={{ color: "var(--stone2)" }}>
                        No claims yet. Create your first claim above.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {claims.map((claim) => (
                        <div key={claim.id} className="border-b last:border-b-0 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                                  {formatDate(claim.claim_period_from)} – {formatDate(claim.claim_period_to)}
                                </span>
                                <Badge
                                  variant={claim.status === "submitted" ? "default" : "secondary"}
                                  className="text-xs"
                                  style={
                                    claim.status === "submitted"
                                      ? { background: "var(--sage-bg)", color: "var(--sage)", border: "none" }
                                      : { background: "var(--gold-bg)", color: "var(--gold2)", border: "none" }
                                  }
                                >
                                  {claim.status === "submitted" ? (
                                    <><CheckCircle2 className="w-3 h-3 mr-1" />Submitted</>
                                  ) : (
                                    <><Clock className="w-3 h-3 mr-1" />Draft</>
                                  )}
                                </Badge>
                              </div>
                              <div className="text-xs mt-1 space-x-3" style={{ color: "var(--stone2)" }}>
                                <span>{claim.donation_count} donations</span>
                                <span style={{ color: "var(--sage)", fontWeight: 600 }}>
                                  Gift Aid: {formatGBP(claim.total_gift_aid_pence)}
                                </span>
                                <span>Total: {formatGBP(claim.total_donations_pence)}</span>
                              </div>
                              {claim.submitted_at && (
                                <div className="text-xs mt-0.5" style={{ color: "var(--stone2)" }}>
                                  Submitted {formatDate(claim.submitted_at)}
                                </div>
                              )}
                            </div>
                            {claim.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitClaim(claim.id)}
                                disabled={isPendingSubmit}
                                className="flex-shrink-0 text-xs"
                                style={{ borderColor: "var(--sage)", color: "var(--sage)" }}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                {isPendingSubmit ? "Submitting…" : "Submit + download CSV"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {submitError && (
              <div
                className="mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--rust-bg)", color: "var(--rust)" }}
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}

            {submitResult && (
              <div
                className="mt-4 rounded-lg p-4 space-y-2"
                style={{ background: "var(--sage-bg)", border: "1px solid var(--sage3)" }}
              >
                <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--sage)" }}>
                  <CheckCircle2 className="w-5 h-5" />
                  Claim submitted — HMRC CSV downloaded
                </div>
                <p className="text-sm" style={{ color: "var(--stone)" }}>
                  Your Charities Online bulk upload CSV has been downloaded. Upload it directly to the{" "}
                  <strong style={{ color: "var(--ink2)" }}>HMRC Charities Online portal</strong> to complete the claim.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-1 text-sm">
                  <div>
                    <div style={{ color: "var(--stone2)" }}>Donations</div>
                    <div className="font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                      {submitResult.summary.donation_count}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--stone2)" }}>Donations total</div>
                    <div className="font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                      {formatGBP(submitResult.summary.total_donations_pence)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--stone2)" }}>Gift Aid claimable</div>
                    <div className="font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--sage)" }}>
                      {formatGBP(submitResult.summary.total_gift_aid_pence)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── DECLARATIONS TAB ── */}
          <TabsContent value="declarations">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                      Gift Aid declarations
                    </CardTitle>
                    <CardDescription>
                      {activeDeclarations.length} active · {revokedDeclarations.length} revoked
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {declarations.length === 0 ? (
                  <div className="py-12 text-center px-4">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium" style={{ color: "var(--ink2)" }}>
                      No declarations on file
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--stone2)" }}>
                      Declarations are added per donor via the Donors section or API
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="tbl w-full">
                      <thead>
                        <tr>
                          <th>Donor</th>
                          <th>Type</th>
                          <th>Effective from</th>
                          <th>Effective to</th>
                          <th>Signed by</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declarations.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <span
                                className="font-mono text-xs px-1.5 py-0.5 rounded"
                                style={{ background: "var(--parchment2)", color: "var(--ink3)" }}
                              >
                                {d.donor_id.slice(0, 8)}…
                              </span>
                            </td>
                            <td>
                              <span className={cn(
                                "chip",
                                d.declaration_type === "enduring" ? "chip-sage" :
                                d.declaration_type === "retro" ? "chip-gold" : "chip-stone"
                              )}>
                                {d.declaration_type}
                              </span>
                            </td>
                            <td style={{ fontSize: ".8rem", color: "var(--stone)" }}>
                              {formatDate(d.effective_from)}
                            </td>
                            <td style={{ fontSize: ".8rem", color: "var(--stone)" }}>
                              {d.effective_to ? formatDate(d.effective_to) : "Open-ended"}
                            </td>
                            <td style={{ fontSize: ".8rem" }}>{d.signed_by_name}</td>
                            <td>
                              {d.revoked_at ? (
                                <span className="chip chip-rust">Revoked</span>
                              ) : (
                                <span className="chip chip-sage">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
