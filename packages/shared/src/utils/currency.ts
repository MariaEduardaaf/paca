const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * @deprecated Pinned to pt-BR/BRL regardless of the couple's locale/currency.
 * Use `formatCurrency` from `useI18n()` (@paca/api) instead.
 */
export function formatCurrency(value: number): string {
  return BRL_FORMATTER.format(value / 100);
}

/**
 * Parses a user-typed money string into integer cents, accepting both
 * comma-decimal ("1.234,56", "12,50") and dot-decimal ("1,234.56", "12.50")
 * conventions.
 *
 * Heuristic: the LAST separator (`.` or `,`) followed by 1-2 digits is the
 * decimal separator; a single separator followed by exactly 3 digits is a
 * thousands separator. Everything else is stripped.
 *
 * Examples: "1.234,56" -> 123456, "12,50" -> 1250, "12.50" -> 1250,
 * "1,234.56" -> 123456, "1234" -> 123400, "3000.5" -> 300050.
 *
 * Returns null when the input is unparseable, negative, or <= 0.
 */
export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || /^-/.test(trimmed)) return null;

  const s = trimmed.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;

  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  let intPart = s;
  let fracPart = "";
  if (lastSep !== -1) {
    const trailing = s.length - lastSep - 1;
    if (trailing >= 1 && trailing <= 2) {
      // 1-2 digits after the last separator: it is the decimal separator.
      intPart = s.slice(0, lastSep);
      fracPart = s.slice(lastSep + 1);
    }
    // 0 or 3+ trailing digits: separator(s) are thousands separators — strip.
  }

  const intDigits = intPart.replace(/[.,]/g, "");
  const cents =
    parseInt(intDigits || "0", 10) * 100 +
    (fracPart ? parseInt(fracPart.padEnd(2, "0"), 10) : 0);

  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

/**
 * Renders integer cents as an editable input string using a decimal comma and
 * no thousands separator. Whole values omit the decimals:
 * 123456 -> "1234,56", 123400 -> "1234".
 */
export function centsToInput(cents: number): string {
  const whole = Math.round(cents);
  if (whole % 100 === 0) return String(whole / 100);
  const sign = whole < 0 ? "-" : "";
  const abs = Math.abs(whole);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/**
 * @deprecated Broken for thousands separators ("1.234,56" parsed as 1.234).
 * Kept only for backwards compatibility — delegates to `parseMoneyInput`.
 */
export function parseCurrencyInput(input: string): number {
  return parseMoneyInput(input) ?? 0;
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}
