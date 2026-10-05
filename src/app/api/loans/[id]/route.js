import { ok, withAuth } from "@/lib/http";
import { getLoan, parseAsOf } from "@/lib/loanService";

// GET /api/loans/:id?asOf=YYYY-MM-DD
// Returns the loan terms, current position, full schedule and payments.
// asOf defaults to today in IST.
export const GET = withAuth(async ({ request, params }) => {
  const asOf = parseAsOf(new URL(request.url).searchParams.get("asOf"));
  return ok(await getLoan(params.id, asOf));
});
