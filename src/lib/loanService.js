import { allocatePayment, computePosition, remainingPaise } from "./allocation.js";
import { parseISODate, todayIST, toISODate } from "./dates.js";
import { ConflictError, NotFoundError, ValidationError } from "./errors.js";
import { bpsToPercent, paiseToRupees, parseRateToBps, parseRupeesToPaise } from "./money.js";
import { prisma } from "./prisma.js";
import { generateSchedule } from "./schedule.js";

const MIN_PRINCIPAL_PAISE = 5000000; // ₹50,000
const MAX_PRINCIPAL_PAISE = 100000000; // ₹10,00,000
const MIN_TENURE = 3;
const MAX_TENURE = 36;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- input validation ----------

// Runs one parser per field and reports every bad field at once.
function validateFields(parsers) {
  const values = {};
  const details = {};
  for (const [field, parse] of Object.entries(parsers)) {
    try {
      values[field] = parse();
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      details[field] = error.message;
    }
  }
  if (Object.keys(details).length) throw new ValidationError("Invalid input", details);
  return values;
}

function requireObject(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }
}

function parsePrincipal(input) {
  const paise = parseRupeesToPaise(input);
  if (paise < MIN_PRINCIPAL_PAISE || paise > MAX_PRINCIPAL_PAISE) {
    throw new ValidationError("must be between 50000 and 1000000 rupees");
  }
  return paise;
}

function parseTenure(input) {
  const text = typeof input === "number" || typeof input === "string" ? String(input).trim() : "";
  if (!/^\d+$/.test(text)) throw new ValidationError("must be a whole number of months");
  const months = Number(text);
  if (months < MIN_TENURE || months > MAX_TENURE) {
    throw new ValidationError(`must be between ${MIN_TENURE} and ${MAX_TENURE} months`);
  }
  return months;
}

function parsePastOrToday(input) {
  const date = parseISODate(input);
  if (date > todayIST()) throw new ValidationError("must not be in the future");
  return date;
}

function parseIdempotencyKey(input) {
  const key = (input ?? "").trim();
  if (!key) throw new ValidationError("header is required");
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ValidationError(`must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`);
  }
  return key;
}

export function parseAsOf(input) {
  if (input === null || input === undefined || input === "") return todayIST();
  return validateFields({ asOf: () => parseISODate(input) }).asOf;
}

// An id that is not even a UUID cannot exist, so it is a 404 rather than a 400.
function assertLoanId(id) {
  if (!UUID_RE.test(id ?? "")) throw new NotFoundError("LOAN_NOT_FOUND", "Loan not found");
}

// ---------- DB rows <-> plain numbers ----------

// Prisma returns BIGINT as BigInt. Every amount fits well inside
// Number.MAX_SAFE_INTEGER (max ₹10,00,000 = 10^8 paise), so convert once here.
function toDomainInstalment(row) {
  return {
    id: row.id,
    seq: row.seq,
    dueDate: row.dueDate,
    principalDuePaise: Number(row.principalDuePaise),
    interestDuePaise: Number(row.interestDuePaise),
    principalPaidPaise: Number(row.principalPaidPaise),
    interestPaidPaise: Number(row.interestPaidPaise),
    settledOn: row.settledOn,
  };
}

function instalmentStatus(inst, asOf) {
  const remaining = remainingPaise(inst);
  if (remaining === 0) return "PAID";
  if (inst.dueDate < asOf) return "OVERDUE";
  return inst.principalPaidPaise + inst.interestPaidPaise > 0 ? "PARTIALLY_PAID" : "DUE";
}

function serializeInstalment(inst, asOf) {
  const totalDue = inst.principalDuePaise + inst.interestDuePaise;
  const totalPaid = inst.principalPaidPaise + inst.interestPaidPaise;
  return {
    seq: inst.seq,
    dueDate: toISODate(inst.dueDate),
    principalDue: paiseToRupees(inst.principalDuePaise),
    interestDue: paiseToRupees(inst.interestDuePaise),
    totalDue: paiseToRupees(totalDue),
    principalPaid: paiseToRupees(inst.principalPaidPaise),
    interestPaid: paiseToRupees(inst.interestPaidPaise),
    amountPaid: paiseToRupees(totalPaid),
    remaining: paiseToRupees(totalDue - totalPaid),
    status: instalmentStatus(inst, asOf),
    settledOn: inst.settledOn ? toISODate(inst.settledOn) : null,
  };
}

function serializePosition(position) {
  return {
    asOf: toISODate(position.asOf),
    outstandingPrincipal: paiseToRupees(position.outstandingPrincipalPaise),
    totalOutstanding: paiseToRupees(position.totalOutstandingPaise),
    nextDue: position.nextDue && {
      seq: position.nextDue.seq,
      dueDate: toISODate(position.nextDue.dueDate),
      amount: paiseToRupees(position.nextDue.amountPaise),
    },
    overdue: {
      amount: paiseToRupees(position.overdue.amountPaise),
      instalmentCount: position.overdue.instalmentCount,
      daysPastDue: position.overdue.daysPastDue,
    },
  };
}

function serializeLoanTerms(loan) {
  return {
    id: loan.id,
    principal: paiseToRupees(loan.principalPaise),
    annualRatePercent: bpsToPercent(loan.annualRateBps),
    tenureMonths: loan.tenureMonths,
    disbursementDate: toISODate(loan.disbursementDate),
    emi: paiseToRupees(loan.emiPaise),
    createdAt: loan.createdAt.toISOString(),
  };
}

function serializePayment(payment) {
  return {
    id: payment.id,
    amount: paiseToRupees(payment.amountPaise),
    paidOn: toISODate(payment.paidOn),
    idempotencyKey: payment.idempotencyKey,
    createdAt: payment.createdAt.toISOString(),
    allocations: (payment.allocations ?? [])
      .map((a) => ({
        seq: a.instalment.seq,
        interest: paiseToRupees(a.interestPaise),
        principal: paiseToRupees(a.principalPaise),
      }))
      .sort((a, b) => a.seq - b.seq),
  };
}

const PAYMENT_INCLUDE = { allocations: { include: { instalment: { select: { seq: true } } } } };

// ---------- operations ----------

export async function createLoan(body) {
  requireObject(body);
  const input = validateFields({
    principal: () => parsePrincipal(body.principal),
    annualRatePercent: () => parseRateToBps(body.annualRatePercent),
    tenureMonths: () => parseTenure(body.tenureMonths),
    disbursementDate: () => parsePastOrToday(body.disbursementDate),
  });

  const { emiPaise, instalments } = generateSchedule({
    principalPaise: input.principal,
    annualRateBps: input.annualRatePercent,
    tenureMonths: input.tenureMonths,
    disbursementDate: input.disbursementDate,
  });

  // Nested create: the loan and its whole schedule are written atomically.
  const loan = await prisma.loan.create({
    data: {
      principalPaise: BigInt(input.principal),
      annualRateBps: input.annualRatePercent,
      tenureMonths: input.tenureMonths,
      disbursementDate: input.disbursementDate,
      emiPaise: BigInt(emiPaise),
      instalments: {
        create: instalments.map((i) => ({
          seq: i.seq,
          dueDate: i.dueDate,
          principalDuePaise: BigInt(i.principalDuePaise),
          interestDuePaise: BigInt(i.interestDuePaise),
        })),
      },
    },
  });

  return getLoan(loan.id, todayIST());
}

export async function listLoans(asOf) {
  const loans = await prisma.loan.findMany({
    orderBy: { createdAt: "asc" },
    include: { instalments: true },
  });
  return loans.map((loan) => ({
    ...serializeLoanTerms(loan),
    position: serializePosition(computePosition(loan.instalments.map(toDomainInstalment), asOf)),
  }));
}

export async function getLoan(id, asOf) {
  assertLoanId(id);
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      instalments: { orderBy: { seq: "asc" } },
      payments: { orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }], include: PAYMENT_INCLUDE },
    },
  });
  if (!loan) throw new NotFoundError("LOAN_NOT_FOUND", "Loan not found");

  const instalments = loan.instalments.map(toDomainInstalment);
  return {
    loan: serializeLoanTerms(loan),
    position: serializePosition(computePosition(instalments, asOf)),
    schedule: instalments.map((i) => serializeInstalment(i, asOf)),
    payments: loan.payments.map(serializePayment),
  };
}

// Records a payment exactly once per (loan, Idempotency-Key).
//   - The loan row is locked (SELECT ... FOR UPDATE) for the whole transaction,
//     so concurrent payments on one loan are applied one after another.
//   - Same key + same amount and date  -> the original payment, not re-applied.
//   - Same key + different body        -> 409 IDEMPOTENCY_CONFLICT.
// Returns { created, payment }.
export async function recordPayment(id, body, idempotencyKeyHeader) {
  assertLoanId(id);
  requireObject(body);
  const input = validateFields({
    idempotencyKey: () => parseIdempotencyKey(idempotencyKeyHeader),
    amount: () => parseRupeesToPaise(body.amount),
    paidOn: () => parsePastOrToday(body.paidOn),
  });

  return prisma.$transaction(
    async (tx) => {
      const [loan] = await tx.$queryRaw`
        SELECT id, disbursement_date AS "disbursementDate"
        FROM loans WHERE id = ${id}::uuid
        FOR UPDATE`;
      if (!loan) throw new NotFoundError("LOAN_NOT_FOUND", "Loan not found");

      const existing = await tx.payment.findUnique({
        where: { loanId_idempotencyKey: { loanId: id, idempotencyKey: input.idempotencyKey } },
        include: PAYMENT_INCLUDE,
      });
      if (existing) {
        const sameBody =
          Number(existing.amountPaise) === input.amount &&
          existing.paidOn.getTime() === input.paidOn.getTime();
        if (!sameBody) {
          throw new ConflictError(
            "IDEMPOTENCY_CONFLICT",
            "This Idempotency-Key was already used for a different payment",
            { original: { amount: paiseToRupees(existing.amountPaise), paidOn: toISODate(existing.paidOn) } },
          );
        }
        return { created: false, payment: serializePayment(existing) };
      }

      if (input.paidOn < loan.disbursementDate) {
        throw new ValidationError("Invalid input", {
          paidOn: "must not be before the disbursement date",
        });
      }

      const rows = await tx.instalment.findMany({ where: { loanId: id }, orderBy: { seq: "asc" } });
      const { allocations, instalments } = allocatePayment(
        rows.map(toDomainInstalment),
        input.amount,
        input.paidOn,
      );

      const payment = await tx.payment.create({
        data: {
          loanId: id,
          amountPaise: BigInt(input.amount),
          paidOn: input.paidOn,
          idempotencyKey: input.idempotencyKey,
          allocations: {
            create: allocations.map((a) => ({
              instalmentId: a.instalmentId,
              interestPaise: BigInt(a.interestPaise),
              principalPaise: BigInt(a.principalPaise),
            })),
          },
        },
        include: PAYMENT_INCLUDE,
      });

      // Write back the running totals for every instalment this payment touched.
      const touched = new Set(allocations.map((a) => a.instalmentId));
      for (const inst of instalments.filter((i) => touched.has(i.id))) {
        await tx.instalment.update({
          where: { id: inst.id },
          data: {
            principalPaidPaise: BigInt(inst.principalPaidPaise),
            interestPaidPaise: BigInt(inst.interestPaidPaise),
            settledOn: inst.settledOn,
          },
        });
      }

      return { created: true, payment: serializePayment(payment) };
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
