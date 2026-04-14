import React from "react";
import { createOrganization } from "@/app/actions/organizations";

export default function OnboardingPage() {
  return (
    <div className="screen center" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-muted)" }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", padding: "2rem" }}>
        <h1 className="card-title" style={{ marginBottom: "0.5rem" }}>Welcome to Steward</h1>
        <p className="card-sub" style={{ marginBottom: "2rem" }}>
          Let's setup your organization to get started. 
        </p>

        <form action={createOrganization}>
          <div className="form-grp" style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="name">Church / Organization Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="e.g. Grace Community Church" 
              required 
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg)" }}
            />
          </div>

          <div className="form-grp" style={{ marginBottom: "2rem" }}>
            <label htmlFor="denomination">Denomination</label>
            <select 
              id="denomination" 
              name="denomination" 
              required
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg)" }}
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

          <button type="submit" className="btn btn-forest" style={{ width: "100%" }}>
            Create Organization
          </button>
        </form>
      </div>
    </div>
  );
}
