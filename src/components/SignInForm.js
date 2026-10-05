"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { getClientAuth } from "@/lib/firebaseClient";
import Brand from "./Brand";

const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Try again in a minute.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
      // onAuthStateChanged in the page swaps this form for the dashboard.
    } catch (err) {
      setError(MESSAGES[err.code] ?? "Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="signin">
      <div className="signin-panel">
        <Brand />
        <form className="card signin-card" onSubmit={handleSubmit}>
          <div>
            <h1>Welcome back</h1>
            <p className="muted">Sign in to view loan schedules and record repayments.</p>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="muted small center">MSME lending · repayment service</p>
      </div>
    </main>
  );
}
