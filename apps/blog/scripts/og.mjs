/**
 * Gerador das imagens de compartilhamento (Open Graph) — uma por artigo.
 *
 * POR QUE ISSO EXISTE
 * Sem ele, todo link do blog compartilhado no WhatsApp/Facebook mostraria a
 * mesma /og-default.png. Aqui cada artigo ganha o seu card 1200x630 em
 * public/og/<slug>.png.
 *
 * MESMA ARTE DA CAPA, UMA DIFERENÇA DE PROPÓSITO
 * A marcação vem de src/lib/cover-art.mjs e o estilo de src/styles/cover.css —
 * exatamente os mesmos arquivos que a capa do site (scripts/capas.mjs) consome.
 * Não existe segunda cópia do desenho: mudou lá, mudou aqui.
 * A única diferença é a PALAVRA GIGANTE:
 *   - na capa do site → a CATEGORIA (o título já aparece embaixo do card; repetir seria redundante);
 *   - aqui           → o TÍTULO do artigo (a imagem viaja sozinha e precisa se explicar).
 *
 * QUANDO RODAR DE NOVO
 *   npm run og            (dentro de apps/blog)
 * Rode sempre que:
 *   - publicar um artigo novo (ou tirar um post de draft);
 *   - mudar o `title` ou a `category` de um artigo já publicado;
 *   - mexer em src/lib/cover-art.mjs ou src/styles/cover.css.
 * Depois de rodar, **comite os PNGs alterados**. E lembre do irmão: as mesmas
 * três situações pedem `npm run capas` (a capa que aparece NO site).
 *
 * O script também AUDITA as regras do sistema de capas antes de desenhar
 * (auditCovers): fundo repetido entre vizinhos da listagem, ou motivo repetido
 * dentro de uma categoria, param a execução com a instrução do que corrigir.
 *
 * POR QUE OS PNGs SÃO VERSIONADOS DE PROPÓSITO
 * O blog é Astro estático buildado na Vercel, e o projeto não aceita dependência
 * npm nova (nada de satori/sharp/puppeteer). A geração depende do Chrome headless
 * instalado localmente, que não existe no build da Vercel — então os PNGs entram no
 * git como artefatos de conteúdo, do mesmo jeito que o texto dos artigos.
 * Se o PNG de um post não existir, o site cai no fallback /og-default.png sozinho
 * (ver src/layouts/BlogPostLayout.astro) — nunca quebra o build.
 *
 * REQUISITOS
 *   - Node 18+ (sem dependências npm)
 *   - Google Chrome em /Applications/Google Chrome.app (ou defina CHROME_BIN)
 *   - Internet: as fontes vêm do Google Fonts com display=block
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A arte inteira: temas, motivos, atribuição por slug e a marcação.
// É .mjs justamente para este script Node conseguir importar sem build.
import { auditCovers, coverArt } from "../src/lib/cover-art.mjs";
// O encanamento (Chrome, frontmatter, rótulos, fontes) é o mesmo do capas.mjs.
import {
  CATEGORY_LABELS,
  CHROME,
  coverPageHtml,
  mascotDataUris,
  optimizePng,
  readPosts,
  shoot,
} from "./lib/render.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content", "blog");
const PUBLIC_DIR = join(ROOT, "public");
const OUT_DIR = join(PUBLIC_DIR, "og");
const COVER_CSS_PATH = join(ROOT, "src", "styles", "cover.css");

// ---------------------------------------------------------------------------
// HTML do card
// ---------------------------------------------------------------------------

function cardHtml({ title, category, slug, css, mascot }) {
  const { html, style } = coverArt({
    slug,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    mode: "title",
    title,
    mascot,
  });

  return coverPageHtml({ html, style, css });
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function main() {
  const posts = readPosts(CONTENT_DIR, "og");

  // As regras do sistema de capas, verificadas contra os artigos de verdade —
  // antes de gastar 18 screenshots numa grade que ficou repetida.
  const { rows, problems } = auditCovers(posts);
  console.log("[og] fundo e motivo de cada artigo (ordem da listagem):\n");
  for (const r of rows) {
    console.log(
      `      ${r.theme.padEnd(6)} ${r.motif.padEnd(16)} ${r.category.padEnd(25)} ${r.slug}`,
    );
  }
  console.log("");
  if (problems.length > 0) {
    console.error(`[og] o sistema de capas quebrou ${problems.length} regra(s):`);
    for (const p of problems) console.error(`      ${p}`);
    process.exit(1);
  }

  if (!existsSync(CHROME)) {
    console.error(
      `[og] Chrome não encontrado em: ${CHROME}\n` +
        `     Instale o Google Chrome ou aponte CHROME_BIN para o binário.`,
    );
    process.exit(1);
  }

  const mascot = mascotDataUris(PUBLIC_DIR);
  const css = readFileSync(COVER_CSS_PATH, "utf8");

  // Sem argumentos: gera tudo. Com argumentos: só os slugs pedidos (útil ao
  // iterar no visual). Ex.: node scripts/og.mjs planilha-gastos-casal
  const only = new Set(process.argv.slice(2));
  const targets =
    only.size > 0 ? posts.filter((p) => only.has(p.slug)) : posts;

  mkdirSync(OUT_DIR, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "paca-og-"));

  let ok = 0;
  try {
    for (const post of targets) {
      const htmlPath = join(work, `${post.slug}.html`);
      const outPath = join(OUT_DIR, `${post.slug}.png`);
      rmSync(outPath, { force: true }); // não confundir sobra antiga com sucesso
      writeFileSync(htmlPath, cardHtml({ ...post, css, mascot }), "utf8");

      await shoot({
        htmlPath,
        outPath,
        profileDir: join(work, `profile-${post.slug}`),
      });

      /*
       * Mesmo pngquant das capas. Ficou de fora na primeira leva de propósito
       * (o AdSense estava em análise e a regra era não tocar no que o revisor
       * vê) — mas os cards já foram refeitos inteiros desde então, o argumento
       * morreu. ~70% de corte num arquivo que o WhatsApp baixa a cada
       * compartilhamento.
       */
      optimizePng(outPath);

      ok++;
      console.log(`[og] ✓ ${post.slug}.png  (${post.category})`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  console.log(
    `\n[og] ${ok}/${targets.length} imagens em public/og/ — lembre de commitar os PNGs.`,
  );
}

main().catch((err) => {
  console.error(`[og] falhou: ${err.message}`);
  process.exit(1);
});
