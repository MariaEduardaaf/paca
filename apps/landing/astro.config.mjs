// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Espelha src/consts.ts: a config do Astro é avaliada antes do código da app,
// então a URL do site precisa existir aqui também. Mesmo padrão do apps/blog.
const SITE_URL = process.env.SITE_URL || "https://pacafinance.com.br";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",

  /*
   * SEM TAILWIND, DE PROPÓSITO — a única divergência estrutural em relação ao
   * apps/blog.
   *
   * O desenho desta página veio pronto de uma ferramenta, como ~600 linhas de
   * CSS escrito à mão em cima de classes semânticas (.hero, .feature-card,
   * .ba-split…). Traduzir isso para utilitários seria reescrever o desenho
   * inteiro para chegar no mesmo pixel — churn puro, com risco de perder
   * fidelidade. O CSS vive em src/styles/global.css, num arquivo só.
   *
   * O blog continua no Tailwind. Os dois projetos deployam separado e não
   * compartilham build, então a divergência não custa nada aos dois.
   */
  integrations: [
    /*
     * Uma página só — mas o sitemap não é enfeite aqui. Existe um projeto de
     * cripto homônimo ("Paca Finance", outro domínio) que disputa a busca de
     * marca; o apex precisa se declarar ao Google pelo caminho mais direto que
     * existe. Sem `serialize`: não há fonte confiável de "quando esta página
     * mudou" (mtime é a hora do checkout no build), e lastmod inventado queima
     * o crédito do sitemap inteiro — mesma regra do apps/blog.
     */
    sitemap(),
  ],
});
