"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [tab, setTab] = useState<"in" | "up">("in");
  const router = useRouter();

  return (
    <div className="screen active" style={{ alignItems: "center", justifyContent: "center", background: "var(--parchment)", display: "flex" }}>
      <button className="btn btn-ghost" style={{ position: "fixed", top: "1.2rem", left: "1.5rem" }} onClick={() => router.push("/")}>
        ← Back
      </button>

      <div className="auth-card fade">
        <div className="auth-logo">
          <div className="logo" style={{ justifyContent: "center", marginBottom: ".3rem" }}>
            <div className="logo-icon">
              <div className="logo-cross"></div>
            </div>
            <div className="logo-name">
              Steward<span>.</span>
            </div>
          </div>
          <div className="auth-tagline">Church finance, faithfully managed</div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "in" ? "active" : ""}`} onClick={() => setTab("in")}>
            Sign in
          </button>
          <button className={`auth-tab ${tab === "up" ? "active" : ""}`} onClick={() => setTab("up")}>
            Create account
          </button>
        </div>

        {tab === "in" && (
          <div className="tab-pane active">
            <button className="social-btn">🔵 Continue with Google</button>
            <div className="divider">or</div>
            <div className="form-grp">
              <label>Email</label>
              <input type="email" placeholder="treasurer@gracebaptist.org" />
            </div>
            <div className="form-grp">
              <label>Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <button className="btn btn-forest" style={{ width: "100%", padding: ".78rem" }} onClick={() => router.push("/dashboard")}>
              Sign in
            </button>
            <div className="auth-foot">
              <Link href="#">Forgot password?</Link>
            </div>
          </div>
        )}

        {tab === "up" && (
          <div className="tab-pane active">
            <div className="form-grp">
              <label>Church / organisation name</label>
              <input type="text" placeholder="Grace Baptist Church" />
            </div>
            <div className="form-grp">
              <label>Your name</label>
              <input type="text" placeholder="Rev. Sarah Thompson" />
            </div>
            <div className="form-grp">
              <label>Email</label>
              <input type="email" placeholder="sarah@gracebaptist.org" />
            </div>
            <div className="form-grp">
              <label>Denomination</label>
              <select>
                <option value="baptist">Baptist</option>
                <option value="anglican">Anglican / Church of England</option>
                <option value="methodist">Methodist</option>
                <option value="pentecostal">Pentecostal / Charismatic</option>
                <option value="catholic">Catholic</option>
                <option value="presbyterian">Presbyterian / Reformed</option>
                <option value="adventist">Seventh-day Adventist</option>
                <option value="independent">Independent / New Church</option>
                <option value="other">Other Christian</option>
              </select>
            </div>
            <div className="form-grp">
              <label>Your role</label>
              <select>
                <option>Church Treasurer</option>
                <option>Finance Manager</option>
                <option>Senior Pastor / Minister</option>
                <option>Church Administrator</option>
                <option>Diocese / Circuit / Conference Officer</option>
                <option>PCC Member</option>
              </select>
            </div>
            {/* Note: The HTML showed pushing to '/pay-screen', in MVP we can just push to dashboard for now */}
            <button className="btn btn-forest" style={{ width: "100%", padding: ".78rem" }} onClick={() => router.push("/dashboard")}>
              Create free account →
            </button>
            <div className="auth-foot">
              By signing up you agree to our <Link href="#">Terms</Link> and <Link href="#">Privacy Policy</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
