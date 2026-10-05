// Browser-side wrapper for our API: attaches the Firebase ID token and turns
// the { error: { code, message, details } } shape into a thrown ApiError.

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = error?.code ?? "UNKNOWN";
    this.details = error?.details ?? null;
  }
}

export async function apiFetch(user, path, { method = "GET", body, headers = {} } = {}) {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error);
  return json.data;
}
