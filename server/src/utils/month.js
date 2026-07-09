const MONTH_RE = /^(\d{4})-(\d{2})/;

// Accepts "YYYY-MM" or "YYYY-MM-DD" and normalizes to the first of that month, "YYYY-MM-01".
export function normalizeMonth(input) {
  const match = String(input).match(MONTH_RE);
  if (!match) return null;
  const [, year, month] = match;
  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > 12) return null;
  return `${year}-${month}-01`;
}

export function addMonths(monthStr, offset) {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 10);
}

export function compareMonths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
