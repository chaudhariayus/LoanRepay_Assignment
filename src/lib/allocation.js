import { daysBetween } from "./dates.js";
import { BusinessRuleError } from "./errors.js";
import { paiseToRupees } from "./money.js";

// Instalments here are plain objects with Number paise:
//   { id?, seq, dueDate, principalDuePaise, interestDuePaise,
//     principalPaidPaise, interestPaidPaise, settledOn }

const interestLeft = (i) => i.interestDuePaise - i.interestPaidPaise;
const principalLeft = (i) => i.principalDuePaise - i.principalPaidPaise;
export const remainingPaise = (i) => interestLeft(i) + principalLeft(i);

const bySeq = (a, b) => a.seq - b.seq;

// Allocation order (documented decision):
//   1. Oldest unpaid instalment first, regardless of due date vs payment date.
//   2. Within an instalment, interest before principal.
//   3. Anything left over moves on to the next instalment, so an overpayment
//      settles future instalments as scheduled. The schedule is never
//      re-amortised and no penalty interest is charged (out of scope).
// A payment larger than everything still owed on the schedule is rejected.
//
// Pure function: returns the allocations and updated copies of the
// instalments; the caller persists them.
export function allocatePayment(instalments, amountPaise, paidOn) {
  const updated = instalments.map((i) => ({ ...i })).sort(bySeq);

  const totalOutstanding = updated.reduce((sum, i) => sum + remainingPaise(i), 0);
  if (amountPaise > totalOutstanding) {
    throw new BusinessRuleError(
      "PAYMENT_EXCEEDS_OUTSTANDING",
      "Payment is larger than the total amount outstanding on the loan",
      { amount: paiseToRupees(amountPaise), totalOutstanding: paiseToRupees(totalOutstanding) },
    );
  }

  const allocations = [];
  let left = amountPaise;

  for (const inst of updated) {
    if (left === 0) break;
    if (remainingPaise(inst) === 0) continue;

    const interestPaise = Math.min(left, interestLeft(inst));
    left -= interestPaise;
    const principalPaise = Math.min(left, principalLeft(inst));
    left -= principalPaise;

    inst.interestPaidPaise += interestPaise;
    inst.principalPaidPaise += principalPaise;
    if (remainingPaise(inst) === 0) inst.settledOn = paidOn;

    allocations.push({ instalmentId: inst.id, seq: inst.seq, interestPaise, principalPaise });
  }

  return { allocations, instalments: updated };
}

// Loan position as of a given date.
//   overdue: instalments due strictly before asOf with something still unpaid.
//            daysPastDue counts from the oldest such due date.
//   nextDue: the first instalment due on or after asOf that is not fully paid,
//            with the amount still owed on it.
export function computePosition(instalments, asOf) {
  const sorted = [...instalments].sort(bySeq);

  const outstandingPrincipalPaise = sorted.reduce((sum, i) => sum + principalLeft(i), 0);
  const totalOutstandingPaise = sorted.reduce((sum, i) => sum + remainingPaise(i), 0);

  const overdueInstalments = sorted.filter((i) => i.dueDate < asOf && remainingPaise(i) > 0);
  const overdueAmountPaise = overdueInstalments.reduce((sum, i) => sum + remainingPaise(i), 0);

  const next = sorted.find((i) => i.dueDate >= asOf && remainingPaise(i) > 0);

  return {
    asOf,
    outstandingPrincipalPaise,
    totalOutstandingPaise,
    nextDue: next ? { seq: next.seq, dueDate: next.dueDate, amountPaise: remainingPaise(next) } : null,
    overdue: {
      amountPaise: overdueAmountPaise,
      instalmentCount: overdueInstalments.length,
      daysPastDue: overdueInstalments.length ? daysBetween(overdueInstalments[0].dueDate, asOf) : 0,
    },
  };
}
