import { ok, readJson, withAuth } from "@/lib/http";
import { createLoan, listLoans, parseAsOf } from "@/lib/loanService";

// POST /api/loans
// Body: { principal: "200000", annualRatePercent: "18", tenureMonths: 24, disbursementDate: "2026-01-15" }
// Creates the loan and persists its full repayment schedule.
export const POST = withAuth(async ({ request }) => {
  const loan = await createLoan(await readJson(request));
  return ok(loan, 201);
});

// GET /api/loans?asOf=YYYY-MM-DD
// Lists loans with their position (used by the UI's loan picker).
export const GET = withAuth(async ({ request }) => {
  const asOf = parseAsOf(new URL(request.url).searchParams.get("asOf"));
  return ok(await listLoans(asOf));
});
