"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", gap: "1rem",
      background: "var(--parchment)", fontFamily: "var(--font-serif)",
    }}>
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <h2 style={{ color: "var(--ink)", margin: 0 }}>Something went wrong</h2>
      <p style={{ color: "var(--stone2)", fontSize: ".85rem", margin: 0 }}>
        {error.message || "An unexpected error occurred loading the dashboard."}
      </p>
      <button
        className="btn btn-forest"
        onClick={reset}
        style={{ marginTop: ".5rem" }}
      >
        Try again
      </button>
    </div>
  );
}
