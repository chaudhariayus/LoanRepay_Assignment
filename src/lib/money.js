import { ValidationError } from "./errors.js";

// Money is handled as integer paise everywhere. Decimal strings are split on
// the point and assembled with integer arithmetic, so no float ever touches
// an amount. Numbers are accepted but go through String() first, which means
// a float artefact like 0.1 + 0.2 is rejected as "more than 2 decimals".

const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

// "9985.5" -> 998550. Shared by rupee amounts and percentage rates, both of
// which are stored in hundredths (paise, basis points).
function parseHundredths(input) {
  if (typeof input !== "string" && typeof input !== "number") {
    throw new ValidationError("must be a number");
  }
  const text = String(input).trim();
  if (text === "") throw new ValidationError("is required");
  if (text.startsWith("-")) throw new ValidationError("must not be negative");
  if (!DECIMAL_RE.test(text)) {
    throw new ValidationError("must be a number with at most 2 decimal places");
  }

  const [whole, frac = ""] = text.split(".");
  const value = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(value)) throw new ValidationError("is too large");
  return value;
}

export function parseRupeesToPaise(input) {
  const paise = parseHundredths(input);
  if (paise === 0) throw new ValidationError("must be greater than zero");
  return paise;
}

// Annual rate in percent ("18", "12.5") -> basis points (1800, 1250).
export function parseRateToBps(input) {
  const bps = parseHundredths(input);
  if (bps > 10000) throw new ValidationError("must be at most 100");
  return bps;
}

// 998550 -> "9985.50". Accepts Number or BigInt (Prisma returns BigInt).
export function paiseToRupees(paise) {
  const value = BigInt(paise);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
