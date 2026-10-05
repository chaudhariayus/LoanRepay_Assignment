// Display helpers for the UI. Amounts arrive from the API as strings like
// "200000.00"; they are formatted as text, never converted to floats.

// "200000.00" -> "₹2,00,000.00" (Indian digit grouping: 3, then 2s).
export function formatINR(amount) {
  const text = String(amount);
  const negative = text.startsWith("-");
  const [whole, frac = "00"] = (negative ? text.slice(1) : text).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ",");
  return `${negative ? "-" : ""}₹${rest ? `${rest},${last3}` : last3}.${frac.padEnd(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-02-15" -> "15 Feb 2026"
export function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// Today's date in India as "YYYY-MM-DD" (en-CA formats dates that way).
export function todayISTString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export const isPositive = (amount) => /[1-9]/.test(String(amount));
