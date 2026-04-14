"use client";
import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDenomination, Denomination } from "@/contexts/DenominationContext";
import CheckoutButton from "@/components/CheckoutButton";

export default function SettingsPage() {
  const { denomination, setDenomination, terms } = useDenomination();

  return (
    <>
      <Topbar 
        title="Settings"
        subtitle="Manage your church details and terminology"
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-head">
            <div className="card-title">Denomination Engine</div>
          </div>
          <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
            Steward automatically adapts terminology across the platform based on your denomination. Try changing it below.
          </p>

          <div className="form-grp" style={{ marginBottom: "2rem" }}>
            <label>Select your denomination</label>
            <select 
              value={denomination} 
              onChange={(e) => setDenomination(e.target.value as Denomination)}
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

          <div className="card-head" style={{ marginTop: "2rem" }}>
            <div className="card-title">Live Terminology Preview</div>
          </div>
          
          <div className="setting-row">
            <div>
              <div className="setting-label">Primary giving terminology</div>
              <div className="setting-desc">Used on dashboards and donor reports.</div>
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

        <div className="card" style={{ maxWidth: 640, marginTop: "2rem" }}>
          <div className="card-head">
            <div className="card-title">Billing & Upgrades</div>
          </div>
          <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
            Upgrade your organization to the Premium Network tier to unlock bulk SMS features and advanced HMRC automated pipelines.
          </p>
          <CheckoutButton plan="premium" amount={49} className="btn btn-forest">
            Upgrade to Premium (£49/mo)
          </CheckoutButton>
        </div>
      </div>
    </>
  );
}
