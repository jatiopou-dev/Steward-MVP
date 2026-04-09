"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, signup } from "./actions";

function AuthForm() {
  const [tab, setTab] = useState<"in" | "up">("in");
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");

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

        {errorMsg && (
          <div style={{ padding: "1rem", background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.1)", color: "red", borderRadius: "8px", marginBottom: "1.5rem", fontSize: ".85rem", textAlign: "center" }}>
            {errorMsg}
          </div>
        )}

        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${tab === "in" ? "active" : ""}`} onClick={() => setTab("in")}>
            Sign in
          </button>
          <button type="button" className={`auth-tab ${tab === "up" ? "active" : ""}`} onClick={() => setTab("up")}>
            Create account
          </button>
        </div>

        {tab === "in" && (
          <form className="tab-pane active" action={login}>
            <button type="button" className="social-btn">🔵 Continue with Google</button>
            <div className="divider">or</div>
            <div className="form-grp">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" placeholder="treasurer@gracebaptist.org" required />
            </div>
            <div className="form-grp">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-forest" style={{ width: "100%", padding: ".78rem" }}>
              Sign in
            </button>
            <div className="auth-foot">
              <Link href="#">Forgot password?</Link>
            </div>
          </form>
        )}

        {tab === "up" && (
          <form className="tab-pane active" action={signup}>
            <div className="form-grp">
              <label htmlFor="church_name">Church / organisation name</label>
              <input type="text" id="church_name" name="church_name" placeholder="Grace Baptist Church" required />
            </div>
            <div className="form-grp">
              <label htmlFor="name">Your name</label>
              <input type="text" id="name" name="name" placeholder="Rev. Sarah Thompson" required />
            </div>
            <div className="form-grp">
              <label htmlFor="role">Your role</label>
              <select name="role">
                <option value="Church Treasurer">Church Treasurer</option>
                <option value="Finance Manager">Finance Manager</option>
                <option value="Senior Pastor">Senior Pastor / Minister</option>
                <option value="Church Administrator">Church Administrator</option>
                <option value="Conference Officer">Diocese / Circuit / Conference Officer</option>
              </select>
            </div>
            <div className="form-grp">
              <label htmlFor="up-email">Email</label>
              <input type="email" id="up-email" name="email" placeholder="sarah@gracebaptist.org" required />
            </div>
            <div className="form-grp">
              <label htmlFor="up-password">Password</label>
              <input type="password" id="up-password" name="password" placeholder="Create a secure password" required minLength={6} />
            </div>
            <button type="submit" className="btn btn-forest" style={{ width: "100%", padding: ".78rem" }}>
              Create free account →
            </button>
            <div className="auth-foot">
              By signing up you agree to our <Link href="#">Terms</Link> and <Link href="#">Privacy Policy</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="screen active" style={{background: "var(--parchment)"}}>Loading authentication...</div>}>
      <AuthForm />
    </Suspense>
  )
}
