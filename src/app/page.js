"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import LoanDashboard from "@/components/LoanDashboard";
import SignInForm from "@/components/SignInForm";
import { getClientAuth } from "@/lib/firebaseClient";

export default function HomePage() {
  // undefined = still checking the saved session, null = signed out.
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);

  if (user === undefined) return <main className="signin muted">Loading…</main>;
  if (!user) return <SignInForm />;
  return <LoanDashboard user={user} onSignOut={() => signOut(getClientAuth())} />;
}
