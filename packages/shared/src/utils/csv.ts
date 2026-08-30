/**
 * Escape a single CSV field: doubles quotes and neutralizes formula injection
 * (=, +, -, @ prefixes are executed by Excel/Sheets; fields can be
 * partner-authored).
 */
export function escapeCsvField(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
