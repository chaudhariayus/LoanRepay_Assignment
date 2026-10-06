import { afterAll, describe, expect, it, vi } from "vitest";

// Only Google's token signature check is stubbed, so the tests need no live
// Firebase login. requireUser, the route handlers and Postgres are all real.
vi.mock("@/lib/firebaseToken", () => ({
  FirebaseConfigError: class FirebaseConfigError extends Error {},
  verifyFirebaseIdToken: async (token) => {
    if (token === "valid-test-token") return { uid: "test-user", email: "test@example.com" };
    throw new Error("invalid token");
  },
}));

const { POST: createLoan } = await import("@/app/api/loans/route");
const { GET: getLoan } = await import("@/app/api/loans/[id]/route");
const { POST: recordPayment } = await import("@/app/api/loans/[id]/payments/route");
const { prisma } = await import("@/lib/prisma");

const BASE = "http://localhost/api/loans";
const AUTH = { authorization: "Bearer valid-test-token" };
const createdLoanIds = [];

function post(url, body, headers = AUTH) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const withId = (id) => ({ params: Promise.resolve({ id }) });

async function newLoan() {
  const res = await createLoan(
    post(BASE, { principal: "200000", annualRatePercent: "18", tenureMonths: 24, disbursementDate: "2026-01-15" }),
  );
  const { data } = await res.json();
  createdLoanIds.push(data.loan.id);
  return { res, data };
}

describe.skipIf(!process.env.TEST_DATABASE_URL)("API route handlers against Postgres", () => {
  afterAll(async () => {
    // Payments are RESTRICT-protected, so delete children first.
    const where = { loanId: { in: createdLoanIds } };
    await prisma.paymentAllocation.deleteMany({ where: { payment: where } });
    await prisma.payment.deleteMany({ where });
    await prisma.loan.deleteMany({ where: { id: { in: createdLoanIds } } });
    await prisma.$disconnect();
  });

  it("creates a loan, records a late payment once, and reflects it in the position", async () => {
    const { res, data } = await newLoan();
    expect(res.status).toBe(201);
    expect(data.loan.emi).toBe("9985.00");
    expect(data.schedule).toHaveLength(24);

    const id = data.loan.id;
    const asOf = `${BASE}/${id}?asOf=2026-02-26`;

    // 11 days after the first due date, nothing paid yet.
    const before = await (await getLoan(new Request(asOf, { headers: AUTH }), withId(id))).json();
    expect(before.data.position.overdue).toEqual({ amount: "9985.00", instalmentCount: 1, daysPastDue: 11 });

    const payment = { amount: "9985.00", paidOn: "2026-02-26" };
    const headers = { ...AUTH, "idempotency-key": "pay-1" };
    const first = await recordPayment(post(`${BASE}/${id}/payments`, payment, headers), withId(id));
    expect(first.status).toBe(201);
    expect((await first.json()).data.payment.allocations).toEqual([
      { seq: 1, interest: "3000.00", principal: "6985.00" },
    ]);

    // A double submit with the same key is not applied twice.
    const replay = await recordPayment(post(`${BASE}/${id}/payments`, payment, headers), withId(id));
    expect(replay.status).toBe(200);
    expect((await replay.json()).data.replayed).toBe(true);
    expect(await prisma.payment.count({ where: { loanId: id } })).toBe(1);

    const after = await (await getLoan(new Request(asOf, { headers: AUTH }), withId(id))).json();
    expect(after.data.position.overdue.amount).toBe("0.00");
    expect(after.data.position.outstandingPrincipal).toBe("193015.00");
    expect(after.data.schedule[0]).toMatchObject({ status: "PAID", amountPaid: "9985.00", settledOn: "2026-02-26" });
  });

  it("rejects invalid input with field details and unknown loans with 404", async () => {
    // Zero-month tenure and non-numeric values on loan creation.
    const loansBefore = await prisma.loan.count();
    const badLoan = await createLoan(
      post(BASE, { principal: "two lakh", annualRatePercent: "abc", tenureMonths: 0, disbursementDate: "2026-01-15" }),
    );
    expect(badLoan.status).toBe(400);
    const badLoanError = (await badLoan.json()).error;
    expect(badLoanError.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(badLoanError.details).sort()).toEqual(["annualRatePercent", "principal", "tenureMonths"]);
    expect(await prisma.loan.count()).toBe(loansBefore);

    const { data } = await newLoan();
    const id = data.loan.id;

    const res = await recordPayment(
      post(`${BASE}/${id}/payments`, { amount: "-5", paidOn: "not-a-date" }, { ...AUTH, "idempotency-key": "bad-1" }),
      withId(id),
    );
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(error.details).sort()).toEqual(["amount", "paidOn"]);
    expect(await prisma.payment.count({ where: { loanId: id } })).toBe(0);

    const missing = "00000000-0000-0000-0000-000000000000";
    const notFound = await getLoan(new Request(`${BASE}/${missing}`, { headers: AUTH }), withId(missing));
    expect(notFound.status).toBe(404);
    expect((await notFound.json()).error.code).toBe("LOAN_NOT_FOUND");
  });

  it("rejects unauthenticated requests before touching the database", async () => {
    const loansBefore = await prisma.loan.count();

    const res = await createLoan(
      post(BASE, { principal: "200000", annualRatePercent: "18", tenureMonths: 24, disbursementDate: "2026-01-15" }, {}),
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    expect(await prisma.loan.count()).toBe(loansBefore);
  });
});
