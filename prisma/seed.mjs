// Seeds demo loans covering each case in the brief. Safe to run repeatedly:
// loans use fixed ids and are skipped if present, and payments go through
// recordPayment with fixed Idempotency-Keys, so a re-run never double-applies.
//
//   npm run db:seed

import { parseISODate } from "../src/lib/dates.js";
import { recordPayment } from "../src/lib/loanService.js";
import { paiseToRupees } from "../src/lib/money.js";
import { prisma } from "../src/lib/prisma.js";
import { generateSchedule } from "../src/lib/schedule.js";

// Payment amounts are summed parts: "inst:N" = instalment N's scheduled
// total; any other part is a signed amount in paise ("-2000000" = −₹20,000).
const LOANS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    label: "A · current (paid on time)",
    principalPaise: 20000000,
    annualRateBps: 1800,
    tenureMonths: 24,
    disbursementDate: "2026-08-20",
    payments: [{ key: "seed-a-1", amount: ["inst:1"], paidOn: "2026-09-20" }],
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    label: "B · overdue (Aug and Sep missed)",
    principalPaise: 50000000,
    annualRateBps: 1500,
    tenureMonths: 12,
    disbursementDate: "2026-05-10",
    payments: [
      { key: "seed-b-1", amount: ["inst:1"], paidOn: "2026-06-10" },
      { key: "seed-b-2", amount: ["inst:2"], paidOn: "2026-07-10" },
    ],
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    label: "C · underpaid (₹5,000 against the Sep instalment)",
    principalPaise: 20000000,
    annualRateBps: 1800,
    tenureMonths: 24,
    disbursementDate: "2026-06-15",
    payments: [
      { key: "seed-c-1", amount: ["inst:1"], paidOn: "2026-07-15" },
      { key: "seed-c-2", amount: ["inst:2"], paidOn: "2026-08-15" },
      { key: "seed-c-3", amount: ["500000"], paidOn: "2026-09-15" },
    ],
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    label: "D · overpaid (2× EMI settles Sep and Oct)",
    principalPaise: 10000000,
    annualRateBps: 1200,
    tenureMonths: 6,
    disbursementDate: "2026-08-05",
    payments: [{ key: "seed-d-1", amount: ["inst:1", "inst:2"], paidOn: "2026-09-05" }],
  },
  {
    id: "e0000000-0000-4000-8000-000000000005",
    label: "E · late (Aug instalment paid 11 days late)",
    principalPaise: 30000000,
    annualRateBps: 1400,
    tenureMonths: 18,
    disbursementDate: "2026-07-10",
    payments: [
      { key: "seed-e-1", amount: ["inst:1"], paidOn: "2026-08-21" },
      { key: "seed-e-2", amount: ["inst:2"], paidOn: "2026-09-10" },
    ],
  },
  {
    id: "f0000000-0000-4000-8000-000000000006",
    label: "F · split payments (each instalment paid in parts)",
    principalPaise: 100000000,
    annualRateBps: 1600,
    tenureMonths: 36,
    disbursementDate: "2026-07-01",
    payments: [
      // Aug instalment in two parts.
      { key: "seed-f-1", amount: ["2000000"], paidOn: "2026-07-28" },
      { key: "seed-f-2", amount: ["inst:1", "-2000000"], paidOn: "2026-08-01" },
      // Sep instalment in three parts.
      { key: "seed-f-3", amount: ["1000000"], paidOn: "2026-08-25" },
      { key: "seed-f-4", amount: ["1500000"], paidOn: "2026-08-30" },
      { key: "seed-f-5", amount: ["inst:2", "-2500000"], paidOn: "2026-09-01" },
      // Oct instalment in two parts, the second three days late.
      { key: "seed-f-6", amount: ["3000000"], paidOn: "2026-10-01" },
      { key: "seed-f-7", amount: ["inst:3", "-3000000"], paidOn: "2026-10-04" },
    ],
  },
];

function paymentPaise(parts, instalments) {
  return parts.reduce((sum, part) => {
    if (!part.startsWith("inst:")) return sum + Number(part);
    const inst = instalments[Number(part.slice(5)) - 1];
    return sum + inst.principalDuePaise + inst.interestDuePaise;
  }, 0);
}

async function seedLoan(spec) {
  const disbursementDate = parseISODate(spec.disbursementDate);
  const { emiPaise, instalments } = generateSchedule({ ...spec, disbursementDate });

  const exists = await prisma.loan.findUnique({ where: { id: spec.id }, select: { id: true } });
  if (!exists) {
    await prisma.loan.create({
      data: {
        id: spec.id,
        principalPaise: BigInt(spec.principalPaise),
        annualRateBps: spec.annualRateBps,
        tenureMonths: spec.tenureMonths,
        disbursementDate,
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
  }

  let applied = 0;
  for (const p of spec.payments) {
    const amount = paiseToRupees(paymentPaise(p.amount, instalments));
    const { created } = await recordPayment(spec.id, { amount, paidOn: p.paidOn }, p.key);
    if (created) applied++;
  }

  console.log(
    `${exists ? "kept   " : "created"} ${spec.id}  ${spec.label}  (${applied} new payment${applied === 1 ? "" : "s"})`,
  );
}

try {
  for (const spec of LOANS) await seedLoan(spec);
} finally {
  await prisma.$disconnect();
}
