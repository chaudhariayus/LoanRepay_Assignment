import { UnauthenticatedError } from "./errors.js";
import { FirebaseConfigError, verifyFirebaseIdToken } from "./firebaseToken.js";

const BEARER_RE = /^Bearer\s+(\S+)$/i;

// Every API route calls this first. The token is verified on the server, so
// a request without a valid Firebase ID token never reaches the handler.
export async function requireUser(request) {
  const match = BEARER_RE.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new UnauthenticatedError("Missing bearer token");

  try {
    return await verifyFirebaseIdToken(match[1]);
  } catch (error) {
    if (error instanceof FirebaseConfigError) throw error; // config problem -> 500
    throw new UnauthenticatedError("Invalid or expired token");
  }
}
