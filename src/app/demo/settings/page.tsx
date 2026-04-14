"use client";
import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination, Denomination } from "@/contexts/DenominationContext";

export default function DemoSettings() {
  const { denomination, setDenomination, terms } = useDenomination();

  return (
    <>
      <Topbar title="Settings" subtitle="Try the denomination engine live — watch language update across the whole demo" />
      <div className="content">
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-head">
            <div className="card-title">Denomination Engine</div>
            <div className="chip chip-sage">Live demo</div>
          </div>
          <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
            Change denomination below and watch every label in the sidebar, overview, and reports update <strong>instantly</strong> — no page reload needed.
          </p>

          <div className="form-grp" style={{ marginBottom: "2rem" }}>
            <label htmlFor="denom-select">Select your denomination</label>
            <select
              id="denom-select"
              value={denomination}
              onChange={(e) => setDenomination(e.target.value as Denomination)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "1rem" }}
            >
              <option value="baptist">Baptist</option>
              <option value="anglican">Anglican / Church of England</option>
              <option value="methodist">Methodist</option>
              <option value="pentecostal">Pentecostal / Charismatic</option>
              <option value="catholic">Catholic</option>
              <option value="presbyterian">Presbyterian / Reformed</option>
              <option value="adventist">Seventh-day Adventist</option>
              <option value="independent">Independent / New Church</option>
            </select>
          </div>

          <div className="card-head" style={{ marginTop: "1rem" }}>
            <div className="card-title">Live Terminology Preview</div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Congregation icon &amp; label</div>
              <div className="setting-desc">Used in the sidebar and org header.</div>
            </div>
            <strong>{terms.icon} {terms.label}</strong>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Primary giving terminology</div>
              <div className="setting-desc">Used on dashboards, donor reports and sidebar.</div>
            </div>
            <strong>{terms.giving}</strong>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Minister / Leader title</div>
              <div className="setting-desc">Used for payroll and staffing labels.</div>
            </div>
            <strong>{terms.minister}</strong>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Governance body</div>
              <div className="setting-desc">The primary team overseeing the church.</div>
            </div>
            <strong>{terms.body}</strong>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Oversight tier</div>
              <div className="setting-desc">Your regional or governing authority level.</div>
            </div>
            <strong>{terms.tier}</strong>
          </div>
        </div>

        <div className="ai-card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".9rem" }}>
            <div className="serif" style={{ color: "var(--cream)", fontSize: ".95rem", fontWeight: 600 }}>
              Like what you see?
            </div>
            <div className="ai-badge">✨ Sign up free</div>
          </div>
          <div className="ai-insight">
            🔓 Sign up to permanently configure your denomination, invite team members, connect your bank statements via CSV, and unlock your 14-day free trial.
          </div>
          <Link href="/auth" className="btn btn-gold btn-sm" style={{ marginTop: "1rem", display: "inline-block" }}>
            Create your account →
          </Link>
        </div>
      </div>
    </>
  );
}
