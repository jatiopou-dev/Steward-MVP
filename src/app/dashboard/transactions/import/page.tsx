"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import Link from "next/link";
import Papa from "papaparse";

export default function ImportTransactionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setParsedRows(results.data);
        
        try {
          // Send to AI for reconciliation
          const res = await fetch("/api/reconcile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: results.data.slice(0, 20) }) // just send first 20 for now to stay fast
          });

          if (!res.ok) {
            throw new Error("Failed to process with AI");
          }

          const data = await res.json();
          setAiSuggestions(data.reconciled || []);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setError(err.message);
        setIsProcessing(false);
      }
    });
  };

  return (
    <>
      <Topbar 
        title="Import Transactions"
        subtitle="Upload bank statement CSV and auto-reconcile"
        actions={
          <>
            <Link href="/dashboard/transactions" className="btn btn-outline btn-sm">Cancel</Link>
          </>
        }
      />
      <div className="content">
        <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3>Upload Bank CSV</h3>
          <p style={{ color: "var(--foreground-muted)" }}>Select a CSV export from your bank (e.g. Barclays, Starling). Claude AI will automatically match the lines to your ledger.</p>
          
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="file-input"
            style={{ padding: "10px", border: "1px dashed var(--border)", borderRadius: "var(--radius)" }}
          />

          {file && !aiSuggestions.length && (
            <button 
              className="btn btn-forest" 
              onClick={handleProcess} 
              disabled={isProcessing}
              style={{ width: "fit-content" }}
            >
              {isProcessing ? "Processing via Claude AI..." : "Reconcile with AI ✨"}
            </button>
          )}

          {error && <div style={{ color: "var(--rust)", padding: "1rem", background: "var(--rust-bg)", borderRadius: "var(--radius)" }}>{error}</div>}

          {aiSuggestions.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <h4>AI Reconciliation Results</h4>
              <p style={{ color: "var(--foreground-muted)", marginBottom: "1rem" }}>Please review Claude's suggestions before bulk importing to the ledger.</p>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Original Bank Description</th>
                    <th>Suggested Category</th>
                    <th>Matched Donor</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSuggestions.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.originalReference}</td>
                      <td><div className="chip chip-sage">{item.suggestedCategory}</div></td>
                      <td>{item.suggestedProfileName || <span style={{ color: "var(--foreground-muted)" }}>--</span>}</td>
                      <td>{(item.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button className="btn btn-outline">Discard</button>
                <button className="btn btn-forest">Approve & Import {aiSuggestions.length} Rows</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
