import React from "react";
import { createOrganization } from "@/app/actions/organizations";

export default function OnboardingPage() {
  return (
    <div className="screen center" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-muted)" }}>
      <div className="card" style={{ maxWidth: 460, width: "100%", padding: "2rem" }}>
        <h1 className="card-title" style={{ marginBottom: "0.5rem" }}>Welcome to Steward</h1>
        <p className="card-sub" style={{ marginBottom: "2rem" }}>
          Set up your church workspace. Steward will tailor terminology to your
          denomination and create starter fund accounts for your first dashboard.
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

          <div
            style={{
              background: "var(--parchment)",
              border: "1px solid var(--parchment2)",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--forest)", marginBottom: ".4rem" }}>
              Starter setup included
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--stone2)", fontSize: ".8rem", lineHeight: 1.7 }}>
              <li>General, Building, and Mission fund accounts</li>
              <li>Denomination-specific giving and leadership terms</li>
              <li>A clean dashboard ready for transactions and members</li>
            </ul>
          </div>

          <button type="submit" className="btn btn-forest" style={{ width: "100%" }}>
            Create church workspace
          </button>
        </form>
      </div>
    </div>
  );
}
