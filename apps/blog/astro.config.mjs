// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// Single source of truth lives in src/consts.ts; this mirrors the same logic
// because astro.config runs before the app code is available.
const SITE_URL = process.env.SITE_URL || "https://blog.pacafinance.com.br";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  integrations: [
    // applyBaseStyles: false — we import our own global.css (with @tailwind
    // directives + hand-rolled prose styles) from BaseLayout.
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
});
