// Shared crypto helpers for Supabase Edge Functions.

/**
 * Constant-time string comparison for shared-secret checks. A plain `!==`
 * short-circuits on the first differing byte and leaks timing information
 * about the expected secret. This XOR-accumulates over every byte instead.
 * (Length inequality still returns early — the length of a high-entropy
 * secret is not useful to an attacker.)
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
