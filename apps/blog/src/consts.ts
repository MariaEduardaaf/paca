export const SITE_TITLE = "Paca Finance";

export const SITE_DESCRIPTION =
  "O blog do Paca Finance: finanças para casais sem briga e sem planilha. Guias práticos para organizar gastos, dividir contas e realizar sonhos a dois.";

// Single place to change the blog's public URL.
// astro.config.mjs mirrors this logic (it runs before app code is available).
export const SITE_URL: string =
  import.meta.env.SITE_URL || "https://blog.pacafinance.com.br";

export const APP_URL = "https://paca-web-twmh.vercel.app";

// Store links — fill in when the apps are published.
// While empty, store badges/links are hidden in the UI.
export const APP_STORE_URL = "";
export const PLAY_STORE_URL = "";
