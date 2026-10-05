import { addMonthsClamped } from "./dates.js";

// Monthly rate = annual bps / 12 / 10000 = bps / 120000.
const BPS_MONTHLY_DIVISOR = 120000n;

// Standard EMI formula. This is the only floating point in the money code:
// the result is rounded to the nearest whole rupee and everything after it
// (interest, principal, allocation) is exact integer arithmetic.
//   EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)
export function computeEmiPaise(principalPaise, annualRateBps, tenureMonths) {
  if (annualRateBps === 0) {
    // Round up so n equal instalments never fall short; the last one is smaller.
    return Math.ceil(principalPaise / tenureMonths / 100) * 100;
  }
  const r = annualRateBps / 120000;
  const growth = (1 + r) ** tenureMonths;
  const emi = (principalPaise * r * growth) / (growth - 1);
  return Math.round(emi / 100) * 100;
}

// round-half-up(outstanding × bps / 120000) on BigInt, so it is exact.
export function monthlyInterestPaise(outstandingPaise, annualRateBps) {
  const numerator = BigInt(outstandingPaise) * BigInt(annualRateBps) * 2n + BPS_MONTHLY_DIVISOR;
  return Number(numerator / (2n * BPS_MONTHLY_DIVISOR));
}

// Builds the full amortisation schedule. Each month's interest is charged on
// the principal still outstanding; the rest of the EMI repays principal. The
// final instalment repays whatever principal is left, so it absorbs all
// rounding and the principal components always sum exactly to P.
export function generateSchedule({ principalPaise, annualRateBps, tenureMonths, disbursementDate }) {
  const emiPaise = computeEmiPaise(principalPaise, annualRateBps, tenureMonths);
  const instalments = [];
  let outstanding = principalPaise;

  for (let seq = 1; seq <= tenureMonths; seq++) {
    const interestDuePaise = monthlyInterestPaise(outstanding, annualRateBps);
    const isLast = seq === tenureMonths;
    const principalDuePaise = isLast
      ? outstanding
      : Math.min(Math.max(emiPaise - interestDuePaise, 0), outstanding);

    instalments.push({
      seq,
      dueDate: addMonthsClamped(disbursementDate, seq),
      principalDuePaise,
      interestDuePaise,
    });
    outstanding -= principalDuePaise;
  }

  return { emiPaise, instalments };
}
