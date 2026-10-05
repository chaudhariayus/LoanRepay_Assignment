import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Verifying ID tokens only needs the project ID: firebase-admin checks the
// signature against Google's public keys. A service account is used when one
// is configured, but is not required for this app.
function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Env vars store the PEM with literal "\n"; turn them back into newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return initializeApp(
    clientEmail && privateKey
      ? { projectId, credential: cert({ projectId, clientEmail, privateKey }) }
      : { projectId },
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
