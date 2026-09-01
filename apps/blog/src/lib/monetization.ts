/**
 * Monetization config — single switch for the whole blog.
 *
 * The ad network is intentionally decoupled behind AdSlot.astro so swapping
 * AdSense -> AdSeleto (AdX) later only touches this file + that component.
 *
 * Nothing renders while ADSENSE_CLIENT is empty: the blog ships clean (better
 * for the AdSense review itself), and ads turn on by setting the env var in
 * Vercel (PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX) — no code change.
 * Remember to also fill public/ads.txt when the ID exists.
 */
export const ADSENSE_CLIENT: string =
  import.meta.env.PUBLIC_ADSENSE_CLIENT || "";

export const ADS_ENABLED = ADSENSE_CLIENT.length > 0;
