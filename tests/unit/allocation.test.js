import { describe, expect, it } from "vitest";
import { allocatePayment, computePosition } from "@/lib/allocation";
import { parseISODate } from "@/lib/dates";
import { BusinessRuleError } from "@/lib/errors";
import { generateSchedule } from "@/lib/schedule";

const date = parseISODate;

// ₹2,00,000 at 18% over 24 months, disbursed 15 Jan 2026: EMI ₹9,985,
// first instalment due 15 Feb 2026 (₹3,000 interest + ₹6,985 principal).
function freshLoan() {
  const { emiPaise, instalments } = generateSchedule({
    principalPaise: 20000000,
    annualRateBps: 1800,
    tenureMonths: 24,
    disbursementDate: date("2026-01-15"),
  });
  return {
    emiPaise,
    instalments: instalments.map((i) => ({
      ...i,
      principalPaidPaise: 0,
      interestPaidPaise: 0,
      settledOn: null,
    })),
  };
}

const paidState = (instalments) =>
  instalments.map(({ seq, interestPaidPaise, principalPaidPaise }) => ({
    seq,
    interestPaidPaise,
    principalPaidPaise,
  }));

describe("allocatePayment", () => {
  it("underpayment: pays interest first, the shortfall becomes overdue after the due date", () => {
    // The brief's example: a ₹9,986 instalment receiving ₹5,000.
    const instalment = {
      seq: 1,
      dueDate: date("2026-02-15"),
      interestDuePaise: 300000,
      principalDuePaise: 698600,
      interestPaidPaise: 0,
      principalPaidPaise: 0,
      settledOn: null,
    };

    const { allocations, instalments } = allocatePayment([instalment], 500000, date("2026-02-10"));

    expect(allocations).toEqual([{ instalmentId: undefined, seq: 1, interestPaise: 300000, principalPaise: 200000 }]);
    expect(instalments[0].settledOn).toBeNull();

    const before = computePosition(instalments, date("2026-02-15"));
    expect(before.overdue.amountPaise).toBe(0);
    expect(before.nextDue.amountPaise).toBe(498600);

    const after = computePosition(instalments, date("2026-02-16"));
    expect(after.overdue).toEqual({ amountPaise: 498600, instalmentCount: 1, daysPastDue: 1 });
  });

  it("overpayment: twice the EMI settles the next instalment as scheduled", () => {
    const { emiPaise, instalments } = freshLoan();

    const result = allocatePayment(instalments, emiPaise * 2, date("2026-02-15"));

    expect(result.allocations.map((a) => a.seq)).toEqual([1, 2]);
    expect(result.instalments[0].settledOn).toEqual(date("2026-02-15"));
    expect(result.instalments[1].settledOn).toEqual(date("2026-02-15"));
    expect(result.instalments[2].interestPaidPaise).toBe(0);

    // Principal falls by exactly the two scheduled principal components,
    // and the schedule is not re-amortised: instalment 3 still owes the EMI.
    const position = computePosition(result.instalments, date("2026-02-15"));
    const repaid = instalments[0].principalDuePaise + instalments[1].principalDuePaise;
    expect(position.outstandingPrincipalPaise).toBe(20000000 - repaid);
    expect(position.nextDue).toMatchObject({ seq: 3, amountPaise: emiPaise });
  });

  it("late payment: overdue with days past due until paid, then settled on the payment date", () => {
    const { emiPaise, instalments } = freshLoan();
    const paidOn = date("2026-02-26"); // 11 days after the 15 Feb due date

    const before = computePosition(instalments, paidOn);
    expect(before.overdue).toEqual({ amountPaise: emiPaise, instalmentCount: 1, daysPastDue: 11 });

    const result = allocatePayment(instalments, emiPaise, paidOn);
    expect(result.instalments[0].settledOn).toEqual(paidOn);

    const after = computePosition(result.instalments, paidOn);
    expect(after.overdue).toEqual({ amountPaise: 0, instalmentCount: 0, daysPastDue: 0 });
    // No penalty interest: the late instalment cost exactly the EMI.
    expect(after.nextDue).toMatchObject({ seq: 2, amountPaise: emiPaise });
  });

  it("split payments end in the same state as one payment of the same total", () => {
    const { instalments } = freshLoan();
    const parts = [250000, 700000, 1300000]; // ₹22,500 in three transactions
    const day = date("2026-03-20");

    let state = instalments;
    for (const amount of parts) state = allocatePayment(state, amount, day).instalments;

    const single = allocatePayment(instalments, 2250000, day).instalments;
    expect(paidState(state)).toEqual(paidState(single));
  });

  it("rejects a payment larger than the total outstanding", () => {
    const { instalments } = freshLoan();
    const total = instalments.reduce((s, i) => s + i.principalDuePaise + i.interestDuePaise, 0);

    expect(() => allocatePayment(instalments, total + 1, date("2026-02-15"))).toThrow(BusinessRuleError);
    // Paying exactly the total is allowed and settles every instalment.
    const { instalments: closed } = allocatePayment(instalments, total, date("2026-02-15"));
    expect(closed.every((i) => i.settledOn !== null)).toBe(true);
  });
});
