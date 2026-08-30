/**
 * Splits transactions into the couple's primary currency vs. foreign-currency
 * rows (stored unconverted when auto-convert is off). Headline totals must sum
 * ONLY primary-currency rows — adding raw cents across currencies is
 * meaningless — but excluded money is surfaced via the per-currency breakdown
 * so nothing is silently dropped.
 */
export interface CurrencyTotals {
  income: number;
  expense: number;
}

export interface CurrencySplit<T> {
  /** Rows in the primary currency (or with no currency set — legacy rows). */
  primary: T[];
  /** Per-currency income/expense totals for the excluded foreign rows. */
  foreign: Map<string, CurrencyTotals>;
}

export function splitByCurrency<
  T extends { type: string; amount: number; currency?: string | null },
>(transactions: T[], primaryCurrency: string): CurrencySplit<T> {
  const primary: T[] = [];
  const foreign = new Map<string, CurrencyTotals>();

  for (const tx of transactions) {
    const cur = tx.currency ?? primaryCurrency;
    if (cur === primaryCurrency) {
      primary.push(tx);
      continue;
    }
    let totals = foreign.get(cur);
    if (!totals) {
      totals = { income: 0, expense: 0 };
      foreign.set(cur, totals);
    }
    if (tx.type === "income") totals.income += tx.amount;
    else totals.expense += tx.amount;
  }

  return { primary, foreign };
}

/**
 * Renders the foreign totals as a compact, formatted list:
 * "+ US$50.00 · − €20.00". Empty string when nothing was excluded.
 */
export function formatForeignBreakdown(
  foreign: Map<string, CurrencyTotals>,
  formatCurrency: (value: number, overrideCurrency?: string | null) => string
): string {
  const parts: string[] = [];
  for (const [cur, totals] of foreign) {
    if (totals.income > 0) parts.push(`+ ${formatCurrency(totals.income, cur)}`);
    if (totals.expense > 0) parts.push(`− ${formatCurrency(totals.expense, cur)}`);
  }
  return parts.join(" · ");
}
