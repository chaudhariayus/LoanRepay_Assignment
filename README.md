# Loan Repayment Service

Next.js (JavaScript) app that generates an EMI repayment schedule, records payments against it and reports the loan's position at any date.

**Live:** _LIVE_URL_ · **Test account:** sent in the submission email · **CI:** [GitHub Actions](https://github.com/chaudhariayus/Vitto_Assignment/actions)

## Seeded loans

Created by `npm run db:seed` (idempotent: fixed ids, payments replayed with fixed idempotency keys). Positions below are as of 6 Oct 2026.

| Loan id | Terms | Case | Position |
|---|---|---|---|
| `a0000000-0000-4000-8000-000000000001` | ₹2,00,000 · 18% · 24m · 20 Aug 2026 | Current, paid on time | Next due 20 Oct, nothing overdue |
| `b0000000-0000-4000-8000-000000000002` | ₹5,00,000 · 15% · 12m · 10 May 2026 | **Overdue**: Aug and Sep missed | ₹90,258.00 overdue, 2 instalments |
| `c0000000-0000-4000-8000-000000000003` | ₹2,00,000 · 18% · 24m · 15 Jun 2026 | **Underpaid**: ₹5,000 against a ₹9,985 instalment | ₹4,985.00 overdue |
| `d0000000-0000-4000-8000-000000000004` | ₹1,00,000 · 12% · 6m · 5 Aug 2026 | **Overpaid**: 2× EMI settles Sep and Oct | Next due 5 Nov |
| `e0000000-0000-4000-8000-000000000005` | ₹3,00,000 · 14% · 18m · 10 Jul 2026 | **Late**: Aug instalment paid 11 days late | Settled on 21 Aug, nothing overdue |

Positions move with the calendar: an unpaid instalment becomes overdue the day after its due date.

## Stack, database and host

Next.js 16 (App Router, route handlers) · React 19 · PostgreSQL on **Neon** · Prisma 6 · Firebase Authentication (email/password; ID tokens verified server-side with `firebase-admin`) · Vitest · GitHub Actions · hosted on **Vercel**.

The schema is created only by Prisma migrations (`prisma/migrations`), applied by `npm run build` and in CI. A hand-written migration adds CHECK constraints (amounts > 0, principal ₹50,000–₹10,00,000, tenure 3–36, paid ≤ due). `payments.loan_id` is `NOT NULL` with a foreign key `ON DELETE RESTRICT`, so a payment cannot exist without its loan.

## Setup

```bash
npm install
cp .env.example .env      # fill in Neon URLs and Firebase web config
npx prisma migrate deploy # create tables
npm run db:seed           # optional demo loans
npm run dev               # http://localhost:3000
```

## Tests

```bash
npm test                  # 9 unit + 3 integration tests
```

Unit tests cover schedule generation and allocation (underpayment, overpayment, 11-day late payment, split payments, paying more than is owed). Integration tests call the real route handlers against a real Postgres: a success path (including a duplicate submit), a failure path (400 field errors, 404) and an unauthenticated request (401). They run only when `TEST_DATABASE_URL` is set and are skipped otherwise; CI provides a throwaway Postgres 16. Only Google's token signature check is stubbed in tests.

## API

All routes require `Authorization: Bearer <Firebase ID token>`. Success: `{ "data": … }`. Error: `{ "error": { "code", "message", "details" } }`. Money is sent and returned as rupee strings with up to 2 decimals (`"9985.00"`); dates as `YYYY-MM-DD`.

| Method | Path | Body | Responses |
|---|---|---|---|
| `POST` | `/api/loans` | `{ principal, annualRatePercent, tenureMonths, disbursementDate }` | 201 loan + schedule + position |
| `GET` | `/api/loans/:id?asOf=YYYY-MM-DD` | — | 200 loan, `position`, `schedule[]`, `payments[]` (asOf defaults to today, IST) |
| `POST` | `/api/loans/:id/payments` | `{ amount, paidOn }` + header `Idempotency-Key` | 201 applied · 200 replay of the same key (not re-applied) |
| `GET` | `/api/loans` | — | 200 loans with position (used by the UI) |

Error codes: `400 VALIDATION_ERROR` (per-field `details`), `401 UNAUTHENTICATED`, `404 LOAN_NOT_FOUND`, `409 IDEMPOTENCY_CONFLICT`, `422 PAYMENT_EXCEEDS_OUTSTANDING`.

## Money and rounding

- **Type:** integer **paise** in `BIGINT` columns; the rate is integer **basis points** (18% = 1800). Input strings are parsed by splitting on the decimal point, never through floats; more than 2 decimals is rejected.
- **EMI:** `P × r × (1+r)^n ÷ ((1+r)^n − 1)` with `r = bps / 120000`. This is the only floating-point step; the result is rounded to the nearest rupee. ₹2,00,000 at 18% for 24 months gives **₹9,985** (the brief's ≈₹9,986 is within the allowed ±₹2). At 0% the EMI is principal ÷ n, rounded up to the rupee.
- **Interest:** each month, `round-half-up(outstanding × bps ÷ 120000)` in BigInt integer arithmetic.
- **Remainder:** the final instalment repays whatever principal is left, so principal components sum exactly to P (for the example above the last instalment is ₹9,979.90).
- **Due dates:** disbursement date + k months, clamped to month end (31 Jan → 28/29 Feb → 31 Mar), always computed from the disbursement date so they never drift.

## Allocation and case decisions

**Order:** oldest unpaid instalment first; within an instalment, interest before principal; any remainder moves to the next instalment. Each split is stored in `payment_allocations` as an audit trail.

| Case | Decision |
|---|---|
| Underpayment | Applied partially (interest first). The shortfall stays on that instalment and becomes overdue after its due date. |
| Overpayment | The excess settles the **next instalments as scheduled**; the schedule is not re-amortised (prepayment closure is out of scope). A payment above the total outstanding is rejected with 422. |
| Late payment | No penalty interest (out of scope). Until paid, the position shows the overdue amount, instalment count and days past due; once paid, the instalment records `settledOn` (the late date). |
| Duplicate | The client sends an `Idempotency-Key`; `(loan_id, idempotency_key)` is unique in the DB. Same key and body → 200 with the original payment; same key, different body → 409. Payments run in a transaction holding `SELECT … FOR UPDATE` on the loan row. |
| Invalid input | 400 with per-field messages: negative/zero/non-numeric amounts, more than 2 decimals, tenure outside 3–36, principal outside range, bad dates, payment before disbursement or in the future. Unknown or malformed loan id → 404. |

**Overdue** means due date before `asOf` with an unpaid remainder. **Next due** is the first instalment due on or after `asOf` that is not fully paid.
