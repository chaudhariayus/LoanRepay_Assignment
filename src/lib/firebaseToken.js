import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Firebase ID tokens with `jose`, following Firebase's guidance for
// third-party JWT libraries: RS256 signature against Google's published keys,
// issuer and audience bound to our project, a non-empty subject, and expiry.
// firebase-admin does the same internally, but its dependency chain
// (jwks-rsa -> ESM-only jose via require()) fails to load on Vercel.

const GOOGLE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
);

// Missing server configuration: a 500, never a 401.
export class FirebaseConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

// Created once per server instance; jose caches the keys and refetches them
// when Google rotates its signing keys.
let jwks;

export async function verifyFirebaseIdToken(token) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new FirebaseConfigError("FIREBASE_PROJECT_ID is not set");

  jwks ??= createRemoteJWKSet(GOOGLE_JWKS_URL);
  const { payload } = await jwtVerify(token, jwks, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new Error("Token has no subject");
  }
  return { uid: payload.sub, email: payload.email ?? null };
}
