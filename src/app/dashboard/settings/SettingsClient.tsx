"use client";
import React, { useState } from "react";
import { useDenomination, termsMap, Denomination } from "@/contexts/DenominationContext";
import { saveDenomination } from "@/app/actions/organizations";
import CheckoutButton from "@/components/CheckoutButton";

type Props = { initialDenomination: Denomination };

export default function SettingsClient({ initialDenomination }: Props) {
  const { denomination, setDenomination } = useDenomination();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const terms = termsMap[denomination] ?? termsMap["independent"];

  async function handleSave(formData: FormData) {
    setSaving(true);
    setSaved(false);
    await saveDenomination(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-head">
          <div className="card-title">Denomination settings</div>
          {saved && <div className="chip chip-sage">Saved</div>}
        </div>
        <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
          Steward adapts terminology across the platform to match your tradition. Changes save to your account.
        </p>

        <form action={handleSave}>
          <div className="form-grp" style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="denomination">Denomination</label>
            <select
              id="denomination"
              name="denomination"
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

          <button
            type="submit"
            className="btn btn-forest"
            disabled={saving}
            style={{ width: "100%", marginBottom: "1.5rem" }}
          >
            {saving ? "Saving…" : "Save denomination"}
          </button>
        </form>

        <div className="card-head" style={{ marginTop: ".5rem" }}>
          <div className="card-title">Live terminology preview</div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Primary giving term</div>
            <div className="setting-desc">Used on dashboards and giving reports.</div>
          </div>
          <strong>{terms.giving}</strong>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Minister / leader title</div>
            <div className="setting-desc">Used for payroll and staffing labels.</div>
          </div>
          <strong>{terms.minister}</strong>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Governance body</div>
            <div className="setting-desc">Primary oversight team.</div>
          </div>
          <strong>{terms.body}</strong>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Oversight tier</div>
            <div className="setting-desc">Your regional governing authority.</div>
          </div>
          <strong>{terms.tier}</strong>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginTop: "2rem" }}>
        <div className="card-head">
          <div className="card-title">Billing & upgrades</div>
        </div>
        <p className="card-sub" style={{ marginBottom: "1.5rem" }}>
          Upgrade to Premium to unlock bulk SMS, automated HMRC pipelines, and multi-site support.
        </p>
        <CheckoutButton plan="premium" className="btn btn-forest">
          Upgrade to Premium (£49/mo)
        </CheckoutButton>
      </div>
    </div>
  );
}
