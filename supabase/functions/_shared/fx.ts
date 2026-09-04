// Shared FX helpers for the edge functions that convert money
// (scan-receipt, scan-statement, advise-purchase). One source of truth so the
// fetch/validate/round rules can't drift between copies again.

// Fetch FX rates for a base currency using exchangerate-api.com free tier.
// Returns a map { target: rate } where amount_in_target = amount_in_base * rate.
// Fails soft: any network/shape error yields {} (convert then reports ok=false).
export async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) return {};
    return data.rates as Record<string, number>;
  } catch (err) {
    console.error("FX fetch failed for base", base, err);
    return {};
  }
}

// Convert an amount (in cents of `from`) to cents of `to`.
// Returns { converted, rate, ok }. On FX failure ok=false — the caller must
// NEVER relabel an unconverted amount as `to` at rate 1: scans keep the
// original currency and flag the row (conversion_failed), the advisor fails
// loudly (502) because its verdict math needs primary-currency cents.
// Pass a `ratesCache` map when converting many amounts in one request
// (scan-statement) so each base currency is fetched at most once.
export async function convert(
  amount: number,
  from: string,
  to: string,
  ratesCache?: Map<string, Record<string, number>>,
): Promise<{ converted: number; rate: number; ok: boolean }> {
  if (from === to) return { converted: amount, rate: 1, ok: true };
  let rates = ratesCache?.get(from);
  if (!rates) {
    rates = await fetchRates(from);
    ratesCache?.set(from, rates);
  }
  const rate = rates[to];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    return { converted: amount, rate: 1, ok: false };
  }
  return { converted: Math.round(amount * rate), rate, ok: true };
}
