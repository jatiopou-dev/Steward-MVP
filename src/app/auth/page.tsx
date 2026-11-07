"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, signInWithGoogle, signup } from "./actions";

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
          /* Its own form: nesting it inside the sign-in form is invalid HTML,
             and sharing that form would make the empty email and password
             fields fail validation before the OAuth submit could fire. */
          <form action={signInWithGoogle}>
            <button type="submit" className="social-btn">
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"/>
                <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z"/>
                <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.8l7.3-5.7z"/>
                <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.3 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z"/>
              </svg>
              Continue with Google
            </button>
            <div className="divider">or</div>
          </form>
        )}

        {tab === "in" && (
          <form className="tab-pane active" action={login}>
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
