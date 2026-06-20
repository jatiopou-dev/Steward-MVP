"use client";

import React, { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mapBankCsvRow } from "@/lib/importMaps/bankCsv";
import { mapStripeRow } from "@/lib/importMaps/stripe";
import { mapTheGivingBlockRow } from "@/lib/importMaps/theGivingBlock";
import { createImportBatch, importDonations } from "@/app/actions/v2/imports";
import type { ImportDonationRow } from "@/lib/validation/v2";
import type { ImportRowResult } from "@/lib/types/v2";

type ImportSource = "bank_csv" | "stripe" | "crypto";

interface ParsedRow {
  raw: Record<string, string>;
  mapped: ImportDonationRow | null;
}

interface ImportResult {
  source_reference: string;
  status: "success" | "error" | "duplicate";
  error?: string;
}

const SOURCE_CONFIG: Record<ImportSource, { label: string; icon: string; description: string; hint: string }> = {
  bank_csv: {
    label: "Bank CSV",
    icon: "🏦",
    description: "Generic UK bank statement export",
    hint: "Expects: Date, Description, Credit/Amount, Reference columns",
  },
  stripe: {
    label: "Stripe",
    icon: "💳",
    description: "Stripe dashboard payments export",
    hint: "Expects: id, created (UTC), amount, status, description columns",
  },
  crypto: {
    label: "The Giving Block",
    icon: "₿",
    description: "The Giving Block crypto settlement CSV",
    hint: "Expects: Settlement Date, Settlement Amount (GBP), Transaction ID, Donor Name",
  },
};

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

export default function DonationImportClient({ orgId }: { orgId: string }) {
  const [source, setSource] = useState<ImportSource>("bank_csv");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapRow = useCallback(
    (raw: Record<string, string>): ImportDonationRow | null => {
      if (source === "bank_csv") return mapBankCsvRow(raw);
      if (source === "stripe") return mapStripeRow(raw);
      if (source === "crypto") return mapTheGivingBlockRow(raw);
      return null;
    },
    [source]
  );

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      setParsed([]);
      setParseError(null);
      setResults(null);
      setServerError(null);

      Papa.parse<Record<string, string>>(f, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            setParseError(`CSV parse error: ${result.errors[0].message}`);
            return;
          }
          const rows: ParsedRow[] = result.data.map((raw) => ({
            raw,
            mapped: mapRow(raw),
          }));
          setParsed(rows);
        },
        error: (err) => setParseError(err.message),
      });
    },
    [mapRow]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const validRows = parsed.filter((r) => r.mapped !== null);
  const skippedRows = parsed.filter((r) => r.mapped === null);
  const totalPence = validRows.reduce((s, r) => s + (r.mapped?.amount_pence ?? 0), 0);

  const handleImport = async () => {
    if (!orgId || validRows.length === 0) return;
    setImporting(true);
    setImportProgress(10);
    setServerError(null);

    const batchResult = await createImportBatch({ organisation_id: orgId, source, filename: file?.name ?? "import.csv" });
    if ("error" in batchResult) {
      setServerError(batchResult.error ?? "Unknown error");
      setImporting(false);
      return;
    }

    setImportProgress(30);

    const donationRows = validRows.map((r) => r.mapped!);
    const importResult = await importDonations({
      organisation_id: orgId,
      batch_id: batchResult.data.id,
      rows: donationRows,
    });

    setImportProgress(100);

    if ("error" in importResult) {
      setServerError(importResult.error ?? "Unknown error");
    } else {
      setResults(importResult.data.rows as ImportResult[]);
    }
    setImporting(false);
  };

  const successCount = results?.filter((r) => r.status === "success").length ?? 0;
  const dupCount = results?.filter((r) => r.status === "duplicate").length ?? 0;
  const errorCount = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <div className="content">
      <div style={{ maxWidth: 900 }}>
        {/* Source selector */}
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
              Import source
            </CardTitle>
            <CardDescription>Choose the format matching your CSV file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(SOURCE_CONFIG) as ImportSource[]).map((s) => {
                const cfg = SOURCE_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSource(s);
                      setFile(null);
                      setParsed([]);
                      setParseError(null);
                      setResults(null);
                    }}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      source === s
                        ? "border-primary bg-accent"
                        : "border-border bg-card hover:border-ring"
                    )}
                  >
                    <div className="text-xl mb-1">{cfg.icon}</div>
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {cfg.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--stone)" }}>
                      {cfg.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-3 px-1" style={{ color: "var(--stone2)" }}>
              {SOURCE_CONFIG[source].hint}
            </p>
          </CardContent>
        </Card>

        {/* Drop zone */}
        {!file && (
          <Card
            className={cn(
              "border-2 border-dashed cursor-pointer transition-all mb-5",
              isDragging ? "border-primary bg-accent" : "border-border hover:border-ring"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "var(--sage-bg)" }}
              >
                <Upload className="w-6 h-6" style={{ color: "var(--sage)" }} />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>
                  Drop your CSV file here
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--stone2)" }}>
                  or click to browse
                </p>
              </div>
              <Badge variant="secondary">{SOURCE_CONFIG[source].label} format</Badge>
            </CardContent>
          </Card>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {parseError && (
          <Card className="mb-5 border-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{parseError}</p>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {file && parsed.length > 0 && !results && (
          <Card className="mb-5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle
                    className="text-base flex items-center gap-2"
                    style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}
                  >
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {parsed.length} rows found · {validRows.length} will import · {skippedRows.length} skipped
                  </CardDescription>
                </div>
                <button
                  className="text-xs"
                  style={{ color: "var(--stone2)" }}
                  onClick={() => { setFile(null); setParsed([]); }}
                >
                  Change file
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3" style={{ background: "var(--sage-bg)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--sage)" }}>
                    To import
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}>
                    {validRows.length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--stone)" }}>donations</div>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--gold-bg)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--gold)" }}>
                    Total value
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--gold2)" }}>
                    {formatGBP(totalPence)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--stone)" }}>gross donations</div>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--parchment2)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stone)" }}>
                    Skipped
                  </div>
                  <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--stone)" }}>
                    {skippedRows.length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--stone2)" }}>debits / invalid</div>
                </div>
              </div>

              {/* Preview table */}
              <Tabs defaultValue="valid">
                <TabsList className="mb-3">
                  <TabsTrigger value="valid">
                    To import ({validRows.length})
                  </TabsTrigger>
                  {skippedRows.length > 0 && (
                    <TabsTrigger value="skipped">
                      Skipped ({skippedRows.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="valid">
                  <div className="rounded-lg border overflow-hidden">
                    <table className="tbl w-full">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reference</th>
                          <th>Description</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, 50).map((r, i) => (
                          <tr key={i}>
                            <td style={{ color: "var(--stone)", fontSize: ".78rem" }}>
                              {r.mapped!.transaction_date}
                            </td>
                            <td
                              style={{
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontFamily: "monospace",
                                fontSize: ".76rem",
                                color: "var(--ink3)",
                              }}
                            >
                              {r.mapped!.source_reference}
                            </td>
                            <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.mapped!.description ?? "—"}
                            </td>
                            <td style={{ textAlign: "right", color: "var(--sage)", fontWeight: 600 }}>
                              {formatGBP(r.mapped!.amount_pence)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validRows.length > 50 && (
                      <div
                        className="text-center py-2 text-xs"
                        style={{ background: "var(--parchment2)", color: "var(--stone2)" }}
                      >
                        Showing first 50 of {validRows.length} rows
                      </div>
                    )}
                  </div>
                </TabsContent>

                {skippedRows.length > 0 && (
                  <TabsContent value="skipped">
                    <div className="rounded-lg border overflow-hidden">
                      <table className="tbl w-full">
                        <thead>
                          <tr>
                            {Object.keys(skippedRows[0]?.raw ?? {}).slice(0, 4).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {skippedRows.slice(0, 20).map((r, i) => (
                            <tr key={i}>
                              {Object.keys(r.raw).slice(0, 4).map((k) => (
                                <td
                                  key={k}
                                  style={{ fontSize: ".78rem", color: "var(--stone)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                >
                                  {r.raw[k] || "—"}
                                </td>
                              ))}
                              <td>
                                <span className="chip chip-stone">Skipped</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              {serverError && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--rust-bg)", color: "var(--rust)" }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--stone)" }}>Importing…</p>
                  <Progress value={importProgress} className="h-1.5" />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                  className="btn-forest"
                  style={{ background: "var(--forest)", color: "var(--cream)" }}
                >
                  {importing ? "Importing…" : `Import ${validRows.length} donations`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFile(null); setParsed([]); setResults(null); }}
                  disabled={importing}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card className="mb-5">
            <CardHeader className="pb-3">
              <CardTitle
                className="text-base"
                style={{ fontFamily: "var(--font-serif)", color: "var(--forest)" }}
              >
                Import complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--sage-bg)" }}>
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "var(--sage)" }} />
                  <div>
                    <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--sage)" }}>
                      {successCount}
                    </div>
                    <div className="text-xs" style={{ color: "var(--stone)" }}>imported</div>
                  </div>
                </div>
                <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--gold-bg)" }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                  <div>
                    <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--gold2)" }}>
                      {dupCount}
                    </div>
                    <div className="text-xs" style={{ color: "var(--stone)" }}>duplicates skipped</div>
                  </div>
                </div>
                <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--rust-bg)" }}>
                  <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--rust)" }} />
                  <div>
                    <div className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--rust)" }}>
                      {errorCount}
                    </div>
                    <div className="text-xs" style={{ color: "var(--stone)" }}>errors</div>
                  </div>
                </div>
              </div>

              {errorCount > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <div
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ background: "var(--rust-bg)", color: "var(--rust)" }}
                  >
                    Errors
                  </div>
                  <table className="tbl w-full">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.filter((r) => r.status === "error").map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "monospace", fontSize: ".76rem" }}>{r.source_reference}</td>
                          <td style={{ color: "var(--rust)", fontSize: ".8rem" }}>{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => { setFile(null); setParsed([]); setResults(null); }}
              >
                Import another file
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
