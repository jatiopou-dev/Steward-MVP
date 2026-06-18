"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import Topbar from "@/components/dashboard/Topbar";
import {
  importTransactions,
  type ImportTransactionsResult,
} from "@/app/actions/transactions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/utils/domainOptions";
import { getFundOptions, type FundOption } from "@/app/actions/funds";

type CsvRow = Record<string, string>;

type ColumnMapping = {
  date: string;
  description: string;
  amount: string;
  debit: string;
  credit: string;
};

type ReviewRow = {
  id: number;
  selected: boolean;
  date: string;
  description: string;
  amountPence: number;
  category: string;
  fundId: string;
  confidence: number | null;
  error: string | null;
};

type ReconciledSuggestion = {
  originalReference: string;
  suggestedCategory: string;
  suggestedProfileName?: string;
  confidence: number;
};

const EMPTY_MAPPING: ColumnMapping = {
  date: "",
  description: "",
  amount: "",
  debit: "",
  credit: "",
};

const INCOME_CATEGORY_SET = new Set<string>(INCOME_CATEGORIES);
const EXPENSE_CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);

const HEADER_ALIASES: Record<keyof ColumnMapping, string[]> = {
  date: ["date", "transactiondate", "postingdate", "valuedate"],
  description: ["description", "details", "reference", "narrative", "transactiondescription", "memo"],
  amount: ["amount", "transactionamount", "value"],
  debit: ["debit", "moneyout", "withdrawal", "paidout"],
  credit: ["credit", "moneyin", "deposit", "paidin"],
};

function normaliseHeader(value: string): string {
  return value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");
}

function detectMapping(headers: string[]): ColumnMapping {
  const findHeader = (key: keyof ColumnMapping) =>
    headers.find((header) => HEADER_ALIASES[key].includes(normaliseHeader(header))) ?? "";

  return {
    date: findHeader("date"),
    description: findHeader("description"),
    amount: findHeader("amount"),
    debit: findHeader("debit"),
    credit: findHeader("credit"),
  };
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  const ukDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (ukDate) {
    const year = ukDate[3].length === 2 ? `20${ukDate[3]}` : ukDate[3];
    const date = new Date(Number(year), Number(ukDate[2]) - 1, Number(ukDate[1]));
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(ukDate[2]) - 1 &&
      date.getDate() === Number(ukDate[1])
    ) {
      return `${year}-${ukDate[2].padStart(2, "0")}-${ukDate[1].padStart(2, "0")}`;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isNegative =
    trimmed.startsWith("-") ||
    (trimmed.startsWith("(") && trimmed.endsWith(")")) ||
    /\bDR$/i.test(trimmed);
  const numeric = Number(trimmed.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100) * (isNegative ? -1 : 1);
}

function suggestedCategory(description: string, amountPence: number): string {
  const value = description.toLocaleLowerCase("en-GB");

  if (amountPence > 0) {
    if (/grant|lottery|trust|foundation/.test(value)) return "Grant";
    if (/hall|room hire|rental/.test(value)) return "Hall hire";
    if (/fundrais|coffee|sale|event/.test(value)) return "Fundraising";
    if (/wedding|funeral|baptism fee/.test(value)) return "Wedding / funeral fees";
    if (/offering|tithe|gift|standing order|donation/.test(value)) return "Regular giving";
    return "Other income";
  }

  if (/salary|payroll|wage|hmrc|pension/.test(value)) return "Payroll & wages";
  if (/electric|gas|water|utility|broadband|phone/.test(value)) return "Utilities";
  if (/insurance/.test(value)) return "Insurance";
  if (/repair|building|maintenance|plumb|roof/.test(value)) return "Building & facilities";
  if (/mission|charity|relief/.test(value)) return "Mission giving";
  if (/worship|music|instrument/.test(value)) return "Worship & music";
  if (/admin|stationery|software|subscription|bank fee/.test(value)) return "Administration";
  if (/community|outreach|foodbank|food bank/.test(value)) return "Community events";
  return "Other expense";
}

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Math.abs(pence) / 100);
}

export default function ImportTransactionsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [defaultFundId, setDefaultFundId] = useState("");
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportTransactionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFundOptions().then((options) => {
      setFunds(options);
      setDefaultFundId(options[0]?.id ?? "");
    });
  }, []);

  const validRows = useMemo(
    () => reviewRows.filter((row) => row.selected && !row.error),
    [reviewRows],
  );

  const invalidCount = reviewRows.filter((row) => row.error).length;
  const incomePence = validRows
    .filter((row) => row.amountPence > 0)
    .reduce((sum, row) => sum + row.amountPence, 0);
  const expensePence = validRows
    .filter((row) => row.amountPence < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountPence), 0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setHeaders([]);
    setRawRows([]);
    setReviewRows([]);
    setResult(null);
    setError(null);

    if (!nextFile) return;
    setIsParsing(true);

    Papa.parse<CsvRow>(nextFile, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (parseResult) => {
        const nextHeaders = parseResult.meta.fields ?? [];
        setHeaders(nextHeaders);
        setRawRows(parseResult.data);
        setMapping(detectMapping(nextHeaders));
        setIsParsing(false);

        if (parseResult.errors.length > 0) {
          setError(`The CSV was read with ${parseResult.errors.length} formatting warning(s). Review the preview carefully.`);
        }
      },
      error: (parseError) => {
        setError(parseError.message);
        setIsParsing(false);
      },
    });
  };

  const prepareReview = () => {
    if (!mapping.date || !mapping.description || (!mapping.amount && !mapping.debit && !mapping.credit)) {
      setError("Map the date, description, and either amount or debit/credit columns.");
      return;
    }

    const prepared = rawRows.map((rawRow, index): ReviewRow => {
      const date = parseDate(rawRow[mapping.date] ?? "");
      const description = (rawRow[mapping.description] ?? "").trim();
      const singleAmount = mapping.amount ? parseMoney(rawRow[mapping.amount] ?? "") : null;
      const debit = mapping.debit ? parseMoney(rawRow[mapping.debit] ?? "") : null;
      const credit = mapping.credit ? parseMoney(rawRow[mapping.credit] ?? "") : null;
      const amountPence = singleAmount ?? (credit ? Math.abs(credit) : debit ? -Math.abs(debit) : 0);
      const errors = [
        !date ? "Invalid date" : null,
        !description ? "Missing description" : null,
        !amountPence ? "Missing or zero amount" : null,
      ].filter(Boolean);

      return {
        id: index,
        selected: errors.length === 0,
        date: date ?? "",
        description,
        amountPence,
        category: suggestedCategory(description, amountPence),
        fundId: defaultFundId,
        confidence: null,
        error: errors.join(", ") || null,
      };
    });

    setReviewRows(prepared);
    setError(null);
  };

  const updateRow = (id: number, changes: Partial<ReviewRow>) => {
    setReviewRows((rows) => rows.map((row) => row.id === id ? { ...row, ...changes } : row));
  };

  const reconcileWithAi = async () => {
    const rows = reviewRows.filter((row) => !row.error).slice(0, 100);
    if (rows.length === 0) return;

    setIsReconciling(true);
    setError(null);

    try {
      const response = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: rows.map((row) => ({
            originalReference: row.description,
            amountPence: row.amountPence,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("AI categorisation is unavailable. You can still review and import using Steward suggestions.");
      }

      const data = await response.json() as { reconciled?: ReconciledSuggestion[] };
      const suggestions = data.reconciled ?? [];
      setReviewRows((currentRows) => currentRows.map((row) => {
        const reviewIndex = rows.findIndex((candidate) => candidate.id === row.id);
        const suggestion = suggestions[reviewIndex];
        if (!suggestion) return row;
        const allowedCategories = row.amountPence >= 0 ? INCOME_CATEGORY_SET : EXPENSE_CATEGORY_SET;
        if (!allowedCategories.has(suggestion.suggestedCategory)) return row;
        return {
          ...row,
          category: suggestion.suggestedCategory,
          confidence: suggestion.confidence,
        };
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI categorisation failed.");
    } finally {
      setIsReconciling(false);
    }
  };

  const approveImport = async () => {
    if (validRows.length === 0) {
      setError("Select at least one valid row to import.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const importResult = await importTransactions(validRows.map((row) => ({
        description: row.description,
        category: row.category,
        amount_pence: row.amountPence,
        date: row.date,
        fund_id: row.fundId,
      })));
      setResult(importResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Import transactions"
        subtitle="Review a bank CSV before adding it to your ledger"
        actions={
          <Link href="/dashboard/transactions" className="btn btn-outline btn-sm">
            Cancel
          </Link>
        }
      />

      <div className="content">
        {result ? (
          <div className="card" style={{ padding: "2rem", maxWidth: 680 }}>
            <div className="card-title" style={{ marginBottom: ".5rem" }}>Import complete</div>
            <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
              Steward added {result.imported} transaction{result.imported === 1 ? "" : "s"} and skipped {result.duplicates} duplicate{result.duplicates === 1 ? "" : "s"}.
            </p>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button className="btn btn-forest" onClick={() => router.push("/dashboard/transactions")}>
                View ledger
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setFile(null);
                  setHeaders([]);
                  setRawRows([]);
                  setReviewRows([]);
                  setResult(null);
                }}
              >
                Import another CSV
              </button>
            </div>
          </div>
        ) : reviewRows.length === 0 ? (
          <div className="card" style={{ padding: "2rem", maxWidth: 860 }}>
            <div className="card-head">
              <div>
                <div className="card-title">1. Choose and map your CSV</div>
                <div className="card-sub">Steward supports a signed amount column or separate debit and credit columns.</div>
              </div>
            </div>

            <div className="form-grp" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="bank-csv">Bank statement CSV</label>
              <input
                id="bank-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="file-input"
                style={{ padding: "12px", border: "1px dashed var(--border)", borderRadius: "8px" }}
              />
              {file && <div className="form-hint">{file.name} · {rawRows.length} rows found</div>}
            </div>

            {headers.length > 0 && (
              <>
                <div className="form-grp" style={{ marginBottom: "1rem" }}>
                  <label>Default fund for imported rows *</label>
                  <select value={defaultFundId} onChange={(event) => setDefaultFundId(event.target.value)}>
                    <option value="">Select a fund</option>
                    {funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
                  </select>
                  <div className="form-hint">You can change individual rows during review.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <MappingSelect label="Date column" value={mapping.date} headers={headers} required onChange={(date) => setMapping({ ...mapping, date })} />
                  <MappingSelect label="Description column" value={mapping.description} headers={headers} required onChange={(description) => setMapping({ ...mapping, description })} />
                  <MappingSelect label="Signed amount column" value={mapping.amount} headers={headers} onChange={(amount) => setMapping({ ...mapping, amount })} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                    <MappingSelect label="Debit column" value={mapping.debit} headers={headers} onChange={(debit) => setMapping({ ...mapping, debit })} />
                    <MappingSelect label="Credit column" value={mapping.credit} headers={headers} onChange={(credit) => setMapping({ ...mapping, credit })} />
                  </div>
                </div>

                <button className="btn btn-forest" onClick={prepareReview} disabled={isParsing || !defaultFundId}>
                  Review {rawRows.length} rows
                </button>
              </>
            )}

            {isParsing && <p className="card-sub">Reading CSV...</p>}
            {error && <ErrorNotice message={error} />}
          </div>
        ) : (
          <>
            <div className="kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="kpi">
                <div className="kpi-lbl">Selected rows</div>
                <div className="kpi-val">{validRows.length}</div>
                <div className="kpi-meta neutral">{invalidCount} need attention</div>
              </div>
              <div className="kpi">
                <div className="kpi-lbl">Income</div>
                <div className="kpi-val">{formatGBP(incomePence)}</div>
                <div className="kpi-meta up">Ready to import</div>
              </div>
              <div className="kpi">
                <div className="kpi-lbl">Expenditure</div>
                <div className="kpi-val">{formatGBP(expensePence)}</div>
                <div className="kpi-meta down">Ready to import</div>
              </div>
              <div className="kpi">
                <div className="kpi-lbl">Net movement</div>
                <div className="kpi-val">{formatGBP(incomePence - expensePence)}</div>
                <div className="kpi-meta neutral">Duplicates checked on import</div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">2. Review transactions</div>
                  <div className="card-sub">Correct categories and deselect anything you do not want in the ledger.</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={reconcileWithAi} disabled={isReconciling}>
                  {isReconciling ? "Categorising..." : "Improve with AI"}
                </button>
              </div>

              {error && <ErrorNotice message={error} />}

              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Import</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Fund</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={Boolean(row.error)}
                            onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
                            aria-label={`Import ${row.description || `row ${row.id + 1}`}`}
                          />
                        </td>
                        <td>{row.date || "—"}</td>
                        <td style={{ minWidth: 220 }}>{row.description || "—"}</td>
                        <td style={{ minWidth: 170 }}>
                          <select
                            value={row.fundId}
                            disabled={Boolean(row.error)}
                            onChange={(event) => updateRow(row.id, { fundId: event.target.value })}
                            style={{ width: "100%" }}
                          >
                            {funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
                          </select>
                        </td>
                        <td style={{ minWidth: 190 }}>
                          <select
                            value={row.category}
                            disabled={Boolean(row.error)}
                            onChange={(event) => updateRow(row.id, { category: event.target.value, confidence: null })}
                            style={{ width: "100%" }}
                          >
                            {(row.amountPence >= 0 ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <strong style={{ color: row.amountPence >= 0 ? "var(--sage)" : "var(--rust)" }}>
                            {row.amountPence >= 0 ? "+" : "−"}{formatGBP(row.amountPence)}
                          </strong>
                        </td>
                        <td>
                          {row.error ? (
                            <span className="chip chip-rust">{row.error}</span>
                          ) : row.confidence !== null ? (
                            <span className="chip chip-sage">AI {Math.round(row.confidence * 100)}%</span>
                          ) : (
                            <span className="chip chip-stone">Steward suggestion</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", gap: ".75rem", justifyContent: "space-between", alignItems: "center" }}>
                <button className="btn btn-outline" onClick={() => setReviewRows([])}>
                  Back to mapping
                </button>
                <button className="btn btn-forest" onClick={approveImport} disabled={isImporting || validRows.length === 0}>
                  {isImporting ? "Importing..." : `Approve and import ${validRows.length} rows`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function MappingSelect({
  label,
  value,
  headers,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-grp">
      <label>{label}{required ? " *" : ""}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not mapped</option>
        {headers.map((header) => <option key={header} value={header}>{header}</option>)}
      </select>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div style={{ color: "var(--rust)", padding: "1rem", background: "var(--rust-bg)", borderRadius: "8px", marginTop: "1rem" }}>
      {message}
    </div>
  );
}
