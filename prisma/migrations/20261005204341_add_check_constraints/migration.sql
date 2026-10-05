-- Hand-written: Prisma cannot express CHECK constraints in schema.prisma.
-- These are a safety net behind application validation. All money is paise.

-- Loans: brief limits are ₹50,000 – ₹10,00,000 and 3 – 36 months.
ALTER TABLE "loans"
  ADD CONSTRAINT "loans_principal_range_chk" CHECK ("principal_paise" BETWEEN 5000000 AND 100000000),
  ADD CONSTRAINT "loans_tenure_range_chk"    CHECK ("tenure_months" BETWEEN 3 AND 36),
  ADD CONSTRAINT "loans_rate_range_chk"      CHECK ("annual_rate_bps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "loans_emi_positive_chk"    CHECK ("emi_paise" > 0);

-- Instalments: components non-negative; paid can never exceed due.
ALTER TABLE "instalments"
  ADD CONSTRAINT "instalments_seq_positive_chk"      CHECK ("seq" > 0),
  ADD CONSTRAINT "instalments_principal_due_chk"     CHECK ("principal_due_paise" >= 0),
  ADD CONSTRAINT "instalments_interest_due_chk"      CHECK ("interest_due_paise" >= 0),
  ADD CONSTRAINT "instalments_principal_paid_chk"    CHECK ("principal_paid_paise" BETWEEN 0 AND "principal_due_paise"),
  ADD CONSTRAINT "instalments_interest_paid_chk"     CHECK ("interest_paid_paise" BETWEEN 0 AND "interest_due_paise");

-- Payments: strictly positive amount; idempotency key must not be blank.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive_chk"      CHECK ("amount_paise" > 0),
  ADD CONSTRAINT "payments_idempotency_key_chk"      CHECK (btrim("idempotency_key") <> '');

-- Allocations: non-negative parts, and each row must move some money.
ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_interest_chk"  CHECK ("interest_paise" >= 0),
  ADD CONSTRAINT "payment_allocations_principal_chk" CHECK ("principal_paise" >= 0),
  ADD CONSTRAINT "payment_allocations_nonzero_chk"   CHECK ("interest_paise" + "principal_paise" > 0);
