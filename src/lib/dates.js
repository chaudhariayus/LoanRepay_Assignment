import { ValidationError } from "./errors.js";

// Calendar dates (no time of day) are represented as Date objects at UTC
// midnight, which is also what Prisma returns for @db.Date columns. All
// arithmetic uses the UTC getters so the server's timezone never matters.

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30, no daylight saving

// "2026-01-31" -> Date. Rejects impossible dates such as 2026-02-30.
export function parseISODate(input) {
  const match = typeof input === "string" ? ISO_DATE_RE.exec(input.trim()) : null;
  if (!match) throw new ValidationError("must be a date in YYYY-MM-DD format");

  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new ValidationError("is not a valid calendar date");
  }
  return date;
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Adds whole months, clamping to the month end: 31 Jan + 1 -> 28 Feb (29 in
// leap years). Always call it from the original disbursement date with the
// instalment number, never chain it, or 31 -> 28 -> 28 would drift.
export function addMonthsClamped(date, months) {
  const total = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

// Today's calendar date in India, regardless of where the server runs.
export function todayIST(now = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
}

// Whole days from `from` to `to` (positive when `to` is later).
export function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}
