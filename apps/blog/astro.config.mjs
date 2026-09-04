// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// Single source of truth lives in src/consts.ts; this mirrors the same logic
// because astro.config runs before the app code is available.
const SITE_URL = process.env.SITE_URL || "https://blog.pacafinance.com.br";

const BLOG_CONTENT_DIR = fileURLToPath(new URL("./src/content/blog", import.meta.url));

/**
 * Lê data e categoria de cada artigo direto do disco.
 *
 * Aqui não dá para usar `astro:content`: a config é avaliada antes de a coleção
 * existir. Daí o parser de frontmatter à mão — ele cobre só o formato que este
 * repo usa (um campo escalar por linha) e devolve `null` quando não reconhece a
 * data, em vez de chutar. É de propósito: o Google descarta o lastmod do site
 * inteiro quando pega datas inconsistentes, então URL sem lastmod é melhor que
 * URL com lastmod errado.
 *
 * @returns {{ slug: string; category: string | null; lastmod: Date }[]}
 */
function readPublishedPosts() {
  const posts = [];

  for (const file of readdirSync(BLOG_CONTENT_DIR)) {
    if (!file.endsWith(".md")) continue;

    const raw = readFileSync(join(BLOG_CONTENT_DIR, file), "utf8");
    // O corpo do artigo pode ter linha "---" (régua horizontal); o índice 1 é
    // sempre o bloco entre os dois primeiros delimitadores, ou seja, o frontmatter.
    const frontmatter = raw.split(/^---\s*$/m)[1] ?? "";

    /** @param {string} key */
    const field = (key) => {
      const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
    };

    if (field("draft") === "true") continue; // rascunho não vira página nem entra em listagem

    // updatedDate ganha do pubDate quando existe: é justamente o sinal de
    // "reescrevi este artigo" que o sitemap precisa carregar.
    const rawDate = field("updatedDate") || field("pubDate");
    if (!rawDate) continue;

    const lastmod = new Date(rawDate);
    if (Number.isNaN(lastmod.getTime())) continue;

    posts.push({
      slug: file.replace(/\.md$/, ""),
      category: field("category"),
      lastmod,
    });
  }

  return posts;
}

/**
 * @param {{ lastmod: Date }[]} posts
 * @returns {Date | null}
 */
function newestDate(posts) {
  /** @type {Date | null} */
  let newest = null;
  for (const post of posts) {
    if (!newest || post.lastmod.getTime() > newest.getTime()) newest = post.lastmod;
  }
  return newest;
}

/**
 * Data por caminho, do jeito que o sitemap precisa consultar.
 *
 * As páginas de listagem (home, /blog, /categorias e cada categoria) montam a
 * grade a partir da coleção, então elas realmente mudam quando um artigo novo
 * entra — a data do artigo mais recente é o lastmod honesto delas.
 *
 * Páginas fixas (/sobre, /contato, /privacidade, /descadastro, calculadora)
 * ficam **sem** lastmod de propósito: aqui não existe fonte confiável de quando
 * elas mudaram (mtime é a hora do checkout no build, não a da edição), e data
 * inventada custa o crédito do sitemap inteiro.
 *
 * @returns {Map<string, Date>}
 */
function buildLastmodByPath() {
  const posts = readPublishedPosts();
  /** @type {Map<string, Date>} */
  const byPath = new Map();

  for (const post of posts) {
    byPath.set(`/blog/${post.slug}`, post.lastmod);
  }

  const newestOverall = newestDate(posts);
  if (newestOverall) {
    for (const path of ["/", "/blog", "/categorias"]) {
      byPath.set(path, newestOverall);
    }
  }

  const categories = new Set(posts.map((post) => post.category).filter(Boolean));
  for (const category of categories) {
    const newestInCategory = newestDate(posts.filter((post) => post.category === category));
    if (newestInCategory) byPath.set(`/categorias/${category}`, newestInCategory);
  }

  return byPath;
}

const LASTMOD_BY_PATH = buildLastmodByPath();

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  integrations: [
    // applyBaseStyles: false — we import our own global.css (with @tailwind
    // directives + hand-rolled prose styles) from BaseLayout.
    tailwind({ applyBaseStyles: false }),
    sitemap({
      // Sem `serialize` o sitemap sai só com <loc>. Atualizar um artigo antigo é
      // a alavanca de tráfego orgânico mais barata que existe, e sem lastmod o
      // Google não fica sabendo — pode levar semanas para recrawlear sozinho.
      serialize(item) {
        // trailingSlash: "never" — a raiz ainda chega como "https://host" (sem
        // path), e `pathname` a normaliza para "/".
        const { pathname } = new URL(item.url);
        const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";

        const lastmod = LASTMOD_BY_PATH.get(path);
        if (lastmod) item.lastmod = lastmod.toISOString();

        return item;
      },
    }),
  ],
});
