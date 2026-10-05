import { ok, readJson, withAuth } from "@/lib/http";
import { recordPayment } from "@/lib/loanService";

// POST /api/loans/:id/payments
// Headers: Idempotency-Key: <unique per payment attempt>
// Body: { amount: "9985.00", paidOn: "2026-02-15" }
// 201 when the payment is applied; 200 with the original payment when the
// same key and body are replayed, so a double submit is never applied twice.
export const POST = withAuth(async ({ request, params }) => {
  const body = await readJson(request);
  const { created, payment } = await recordPayment(
    params.id,
    body,
    request.headers.get("idempotency-key"),
  );
  return ok({ payment, replayed: !created }, created ? 201 : 200);
});
