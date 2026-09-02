/**
 * Gerador das imagens de compartilhamento (Open Graph) — uma por artigo.
 *
 * POR QUE ISSO EXISTE
 * Sem ele, todo link do blog compartilhado no WhatsApp/Facebook mostraria a
 * mesma /og-default.png. Aqui cada artigo ganha o seu card 1200x630 em
 * public/og/<slug>.png.
 *
 * MESMA ARTE DO SITE, UMA DIFERENÇA DE PROPÓSITO
 * A marcação vem de src/lib/cover-art.mjs e o estilo de src/styles/cover.css —
 * exatamente os mesmos arquivos que a capa do site (src/components/Cover.astro)
 * consome. Não existe segunda cópia do desenho: mudou lá, mudou aqui.
 * A única diferença é a PALAVRA GIGANTE:
 *   - no site   → a CATEGORIA (o título já aparece embaixo do card; repetir seria redundante);
 *   - aqui      → o TÍTULO do artigo (a imagem viaja sozinha e precisa se explicar).
 *
 * QUANDO RODAR DE NOVO
 *   npm run og            (dentro de apps/blog)
 * Rode sempre que:
 *   - publicar um artigo novo (ou tirar um post de draft);
 *   - mudar o `title` ou a `category` de um artigo já publicado;
 *   - mexer em src/lib/cover-art.mjs ou src/styles/cover.css.
 * Depois de rodar, **comite os PNGs alterados**.
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

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A arte inteira: temas, motivos, atribuição por slug e a marcação.
// É .mjs justamente para este script Node conseguir importar sem build.
import { auditCovers, coverArt } from "../src/lib/cover-art.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content", "blog");
const PUBLIC_DIR = join(ROOT, "public");
const OUT_DIR = join(PUBLIC_DIR, "og");
const COVER_CSS_PATH = join(ROOT, "src", "styles", "cover.css");

const CHROME =
  process.env.CHROME_BIN ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Rótulos das categorias — espelham `label` de src/lib/categories.ts, que é
 * TypeScript e um script Node puro não importa. É a ÚNICA coisa duplicada do
 * sistema de capas; se mudar um rótulo lá, mude aqui.
 */
const CATEGORY_LABELS = {
  "dividir-contas": "Dividir contas",
  organizacao: "Organização",
  "conversas-sobre-dinheiro": "Conversas sobre dinheiro",
  "metas-e-sonhos": "Metas e sonhos",
  ferramentas: "Ferramentas",
};

/**
 * A mesma família de fontes do site (src/layouts/BaseLayout.astro), com o eixo
 * óptico e o peso 800 que a palavra gigante precisa — sem o 800 a tipografia
 * sai visivelmente mais leve que o desenho aprovado. `display=block` porque um
 * screenshot não espera swap: com `swap` o card sairia na fonte de fallback.
 */
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=block";

// ---------------------------------------------------------------------------
// Frontmatter (parser mínimo: só title / category / pubDate / draft)
// ---------------------------------------------------------------------------

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    data[kv[1]] = value;
  }
  return data;
}

// ---------------------------------------------------------------------------
// HTML do card
// ---------------------------------------------------------------------------

/**
 * A página do screenshot. O corpo é UM `.paca-cover` de 1200x630 — como ele é
 * a "container query" da folha compartilhada, `--u` vale exatamente 1px aqui e
 * cada número da spec cai no pixel do canvas.
 */
function cardHtml({ title, category, slug, css, mascot }) {
  const { html, style } = coverArt({
    slug,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    mode: "title",
    title,
    mascot,
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${FONTS_URL}" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  .paca-cover { width: 1200px; height: 630px; }
</style>
<style>
${css}
</style>
</head>
<body>
  <div class="paca-cover" style="${style}">${html}</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tira o screenshot de um HTML local.
 *
 * ATENÇÃO (armadilha real): o Chrome 152 headless escreve o PNG do --screenshot
 * mas NÃO encerra o processo sozinho — um execFileSync aqui trava para sempre.
 * Por isso a gente sobe o Chrome solto, espera o arquivo aparecer com tamanho
 * estável e mata o processo na mão.
 */
async function shoot({ htmlPath, outPath, profileDir }) {
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--force-color-profile=srgb",
      // Alto de propósito: dá tempo do Google Fonts (display=block) baixar e
      // aplicar antes do print — sem isso, o card sai na fonte de fallback.
      "--virtual-time-budget=15000",
      "--window-size=1200,630",
      `--user-data-dir=${profileDir}`,
      `--screenshot=${outPath}`,
      `file://${htmlPath}`,
    ],
    { stdio: "ignore" },
  );

  let lastSize = -1;
  let stableFor = 0;
  const deadline = Date.now() + 90_000;

  try {
    while (Date.now() < deadline) {
      await sleep(300);
      let size = 0;
      try {
        size = statSync(outPath).size;
      } catch {
        /* ainda não escreveu */
      }
      if (size > 0 && size === lastSize) {
        stableFor += 1;
        if (stableFor >= 3) return; // 3 leituras iguais => PNG completo
      } else {
        stableFor = 0;
      }
      lastSize = size;
    }
    throw new Error(`timeout esperando o screenshot de ${outPath}`);
  } finally {
    child.kill("SIGKILL");
  }
}

/** Lê todos os artigos publicados (sem draft), com o que a capa precisa. */
function readPosts() {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const posts = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const data = parseFrontmatter(readFileSync(join(CONTENT_DIR, file), "utf8"));
    if (!data) {
      console.warn(`[og] pulando ${file}: sem frontmatter`);
      continue;
    }
    if (data.draft === "true") {
      console.log(`[og] pulando ${slug}: draft`);
      continue;
    }
    if (!data.title || !CATEGORY_LABELS[data.category]) {
      console.warn(`[og] pulando ${file}: title/category inválidos`);
      continue;
    }
    posts.push({
      slug,
      title: data.title,
      category: data.category,
      pubDate: data.pubDate,
    });
  }
  return posts;
}

async function main() {
  const posts = readPosts();

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

  // O mascote entra como data URI: o HTML mora num diretório temporário, então
  // um caminho relativo não acharia o PNG de public/.
  const dataUri = (name) =>
    `data:image/png;base64,${readFileSync(join(PUBLIC_DIR, name)).toString("base64")}`;
  const mascot = {
    light: dataUri("paca-mascote.png"),
    dark: dataUri("paca-mascote-dark.png"),
  };

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
