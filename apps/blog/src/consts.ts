export const SITE_TITLE = "Paca Finance";

export const SITE_DESCRIPTION =
  "O blog do Paca Finance: finanças para casais sem briga e sem planilha. Guias práticos para organizar gastos, dividir contas e realizar sonhos a dois.";

// Single place to change the blog's public URL.
// astro.config.mjs mirrors this logic (it runs before app code is available).
export const SITE_URL: string =
  import.meta.env.SITE_URL || "https://blog.pacafinance.com.br";

export const APP_URL = "https://paca-web-twmh.vercel.app";

// Captura de e-mail do blog (Supabase Edge Function `blog-subscribe`).
// Contrato congelado: POST { email, consent, source, hp } →
// 200 {ok:true} | 400 {error:"invalid_email"|"consent_required"} |
// 429 {error:"rate_limited"} | 500 {error:"server_error"}.
// A base de leads do blog é separada da base de usuários do app (LGPD:
// consentimento próprio, específico para marketing, e descadastro desde o dia 1).
export const SUBSCRIBE_ENDPOINT =
  "https://gtumyiwokhroizmqcbve.functions.supabase.co/blog-subscribe";

// Store links — fill in when the apps are published.
// While empty, store badges/links are hidden in the UI.
export const APP_STORE_URL = "";
export const PLAY_STORE_URL = "";
