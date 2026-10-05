import { UnauthenticatedError } from "./errors.js";
import { getAdminAuth } from "./firebaseAdmin.js";

const BEARER_RE = /^Bearer\s+(\S+)$/i;

// Every API route calls this first. The token is verified on the server, so
// a request without a valid Firebase ID token never reaches the handler.
export async function requireUser(request) {
  const match = BEARER_RE.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new UnauthenticatedError("Missing bearer token");

  const auth = getAdminAuth(); // config errors surface as 500, not 401
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    throw new UnauthenticatedError("Invalid or expired token");
  }
}
