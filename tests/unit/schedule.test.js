import { describe, expect, it } from "vitest";
import { parseISODate, toISODate } from "@/lib/dates";
import { generateSchedule, monthlyInterestPaise } from "@/lib/schedule";

const sum = (values) => values.reduce((a, b) => a + b, 0);

describe("generateSchedule", () => {
  it("matches the brief's reference EMI: ₹2,00,000 at 18% over 24 months", () => {
    const { emiPaise } = generateSchedule({
      principalPaise: 20000000,
      annualRateBps: 1800,
      tenureMonths: 24,
      disbursementDate: parseISODate("2026-01-15"),
    });

    expect(emiPaise).toBe(998500); // ₹9,985; brief says ≈ ₹9,986 with ±₹2 allowed
    expect(Math.abs(emiPaise - 998600)).toBeLessThanOrEqual(200);
  });

  it("charges interest on the outstanding balance and repays principal exactly", () => {
    const principalPaise = 20000000;
    const { emiPaise, instalments } = generateSchedule({
      principalPaise,
      annualRateBps: 1800,
      tenureMonths: 24,
      disbursementDate: parseISODate("2026-01-15"),
    });

    expect(instalments).toHaveLength(24);
    expect(instalments[0].interestDuePaise).toBe(300000); // 1.5% of ₹2,00,000
    expect(sum(instalments.map((i) => i.principalDuePaise))).toBe(principalPaise);

    let outstanding = principalPaise;
    for (const inst of instalments) {
      expect(Number.isInteger(inst.principalDuePaise)).toBe(true);
      expect(inst.interestDuePaise).toBe(monthlyInterestPaise(outstanding, 1800));
      outstanding -= inst.principalDuePaise;
    }

    // Every instalment except the last is exactly the EMI; the last absorbs
    // the rounding and stays within a few rupees of it.
    const totals = instalments.map((i) => i.principalDuePaise + i.interestDuePaise);
    expect(totals.slice(0, -1).every((t) => t === emiPaise)).toBe(true);
    expect(Math.abs(totals.at(-1) - emiPaise)).toBeLessThan(5000);
  });

  it("clamps due dates to month end without drifting", () => {
    const { instalments } = generateSchedule({
      principalPaise: 5000000,
      annualRateBps: 1200,
      tenureMonths: 4,
      disbursementDate: parseISODate("2028-01-31"),
    });

    expect(instalments.map((i) => toISODate(i.dueDate))).toEqual([
      "2028-02-29", // leap year
      "2028-03-31", // back to the 31st, not stuck on the 29th
      "2028-04-30",
      "2028-05-31",
    ]);
  });

  it("splits principal evenly at 0% and puts the remainder in the last instalment", () => {
    const { emiPaise, instalments } = generateSchedule({
      principalPaise: 5000000, // ₹50,000 / 36 does not divide evenly
      annualRateBps: 0,
      tenureMonths: 36,
      disbursementDate: parseISODate("2026-01-01"),
    });

    expect(emiPaise).toBe(138900); // ₹1,388.89 rounded up to ₹1,389
    expect(instalments.every((i) => i.interestDuePaise === 0)).toBe(true);
    expect(sum(instalments.map((i) => i.principalDuePaise))).toBe(5000000);
    expect(instalments.at(-1).principalDuePaise).toBe(5000000 - 138900 * 35);
  });
});
