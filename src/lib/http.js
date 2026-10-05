import { NextResponse } from "next/server";
import { requireUser } from "./auth.js";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "./errors.js";

// Every endpoint responds with one of two shapes:
//   success: { data: ... }
//   error:   { error: { code, message, details } }   (details may be null)

export function ok(data, status = 200) {
  return NextResponse.json({ data }, { status });
}

function fail(status, code, message, details = null) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

function toErrorResponse(error) {
  if (error instanceof UnauthenticatedError) return fail(401, "UNAUTHENTICATED", error.message);
  if (error instanceof ValidationError) {
    return fail(400, "VALIDATION_ERROR", error.message, error.details ?? null);
  }
  if (error instanceof NotFoundError) return fail(404, error.code, error.message);
  if (error instanceof ConflictError) return fail(409, error.code, error.message, error.details ?? null);
  if (error instanceof BusinessRuleError) {
    return fail(422, error.code, error.message, error.details ?? null);
  }
  console.error(error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong");
}

// Wraps a route handler: verifies the Firebase token first (so unauthenticated
// requests are rejected before any work), resolves params, maps errors.
export function withAuth(handler) {
  return async (request, context) => {
    try {
      const user = await requireUser(request);
      const params = (await context?.params) ?? {};
      return await handler({ request, params, user });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}
