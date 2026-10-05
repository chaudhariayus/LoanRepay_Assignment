"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { getClientAuth } from "@/lib/firebaseClient";

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
      <form className="card signin-card" onSubmit={handleSubmit}>
        <h1>Vitto Loan Repayment</h1>
        <p className="muted">Sign in to view loans and record payments.</p>

        <label>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
