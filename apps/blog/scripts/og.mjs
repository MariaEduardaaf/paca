/**
 * Gerador das imagens de compartilhamento (Open Graph) — uma por artigo.
 *
 * POR QUE ISSO EXISTE
 * Antes, todo link do blog compartilhado no WhatsApp/Facebook mostrava a mesma
 * /og-default.png. Agora cada artigo tem o seu card 1200x630 em public/og/<slug>.png,
 * usando a mesma identidade visual das capas do site (src/lib/covers.ts + Cover.astro):
 * fundo na cor da categoria, rótulo da categoria, título em Bricolage Grotesque,
 * motivo geométrico da categoria e a assinatura "paca finance".
 *
 * QUANDO RODAR DE NOVO
 *   npm run og            (dentro de apps/blog)
 * Rode sempre que:
 *   - publicar um artigo novo (ou tirar um post de draft);
 *   - mudar o `title` ou a `category` de um artigo já publicado;
 *   - mexer nas paletas de COVER_PALETTES / no visual do card aqui.
 * Depois de rodar, **comite os PNGs alterados**.
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content", "blog");
const PUBLIC_DIR = join(ROOT, "public");
const OUT_DIR = join(PUBLIC_DIR, "og");

const CHROME =
  process.env.CHROME_BIN ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// ---------------------------------------------------------------------------
// Identidade visual — espelha src/lib/covers.ts e src/lib/categories.ts.
// Se mudar lá, mude aqui (não dá para importar .ts de um script Node puro).
// ---------------------------------------------------------------------------

const COVER_INK = "#2A1B22";

const COVER_PALETTES = {
  "dividir-contas": {
    bg: "#FFE1E9", fg: "#E5647A", word: "dividir",
    kicker: "#C2445C", label: "Dividir contas",
  },
  organizacao: {
    bg: "#E9F7F0", fg: "#3E8E7A", word: "organizar",
    kicker: "#2E7263", label: "Organização",
  },
  "conversas-sobre-dinheiro": {
    bg: "#FDEAE4", fg: "#D96A50", word: "conversar",
    kicker: "#B24A33", label: "Conversas sobre dinheiro",
  },
  "metas-e-sonhos": {
    bg: "#FFF3E0", fg: "#DC9A3E", word: "sonhar",
    kicker: "#8F6314", label: "Metas e sonhos",
  },
  ferramentas: {
    bg: "#EFECF7", fg: "#7A6BB5", word: "ferramentas",
    kicker: "#5D4E96", label: "Ferramentas",
  },
};

/** Motivos geométricos por categoria, desenhados num viewBox 0 0 620 620. */
function motif(category, fg) {
  switch (category) {
    case "dividir-contas":
      // Dois anéis sobrepostos — o casal; a lente comum é o que se divide.
      return `
        <circle cx="220" cy="310" r="170" fill="none" stroke="${fg}" stroke-width="40" />
        <circle cx="400" cy="310" r="170" fill="none" stroke="${fg}" stroke-width="40" />
        <path d="M 310 166 A 170 170 0 0 1 310 454 A 170 170 0 0 1 310 166 Z" fill="${fg}" opacity="0.35" />`;
    case "organizacao":
      // Pizza com uma fatia puxada — o orçamento tomando forma.
      return `
        <path d="M 300 320 L 300 130 A 190 190 0 1 1 110 320 Z" fill="${fg}" />
        <path d="M 268 288 L 78 288 A 190 190 0 0 1 268 98 Z" fill="${fg}" opacity="0.45" />`;
    case "conversas-sobre-dinheiro":
      // Dois balões de fala no meio da conversa.
      return `
        <path d="M 70 110 h 300 a 48 48 0 0 1 48 48 v 120 a 48 48 0 0 1 -48 48 h -180 l -72 76 v -76 h -48 a 48 48 0 0 1 -48 -48 v -120 a 48 48 0 0 1 48 -48 Z" fill="${fg}" />
        <path d="M 290 300 h 260 a 44 44 0 0 1 44 44 v 104 a 44 44 0 0 1 -44 44 h -44 v 68 l -66 -68 h -150 a 44 44 0 0 1 -44 -44 v -104 a 44 44 0 0 1 44 -44 Z" fill="${fg}" opacity="0.45" />`;
    case "metas-e-sonhos":
      // Alvo concêntrico — a meta que o casal mira.
      return `
        <circle cx="310" cy="310" r="228" fill="none" stroke="${fg}" stroke-width="36" opacity="0.4" />
        <circle cx="310" cy="310" r="144" fill="none" stroke="${fg}" stroke-width="36" opacity="0.7" />
        <circle cx="310" cy="310" r="58" fill="${fg}" />`;
    case "ferramentas":
      // Células de planilha — uma já preenchida.
      return `
        <rect x="62" y="62" width="220" height="220" rx="42" fill="none" stroke="${fg}" stroke-width="28" />
        <rect x="338" y="62" width="220" height="220" rx="42" fill="none" stroke="${fg}" stroke-width="28" />
        <rect x="62" y="338" width="220" height="220" rx="42" fill="none" stroke="${fg}" stroke-width="28" />
        <rect x="338" y="338" width="220" height="220" rx="42" fill="${fg}" />`;
    default:
      return "";
  }
}

/** Mesmo hash de src/lib/covers.ts — cada slug sempre recebe a mesma variação. */
function coverVariant(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return { rotation: [-8, 0, 8][h % 3] };
}

// ---------------------------------------------------------------------------
// Frontmatter (parser mínimo: só title / category / draft)
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

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Título longo tem que quebrar em linhas e continuar legível: a fonte encolhe
 * por faixas de comprimento, calibradas para a coluna de 646px do card (a
 * largura livre à esquerda do motivo geométrico).
 */
function titleStyle(title) {
  const n = title.length;
  if (n <= 28) return { size: 82, lh: 1.05, track: -2.5 };
  if (n <= 42) return { size: 72, lh: 1.06, track: -2 };
  if (n <= 58) return { size: 63, lh: 1.08, track: -1.6 };
  if (n <= 74) return { size: 55, lh: 1.1, track: -1.2 };
  if (n <= 95) return { size: 47, lh: 1.12, track: -0.8 };
  return { size: 40, lh: 1.14, track: -0.4 };
}

function cardHtml({ title, category, slug, logoDataUri }) {
  const palette = COVER_PALETTES[category];
  const { rotation } = coverVariant(slug);
  const t = titleStyle(title);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@500;700&display=block" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    overflow: hidden;
    background: ${palette.bg};
    font-family: 'DM Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; }

  /* Marca d'água tipográfica: a mesma palavra das capas, cortada pela borda.
     Fica sozinha na faixa de baixo — a assinatura da marca subiu para o topo
     justamente para nada se sobrepor a ela. */
  .watermark {
    position: absolute; left: 62px; bottom: -74px;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 800; font-size: 200px; line-height: 1;
    letter-spacing: -7px; color: ${COVER_INK}; opacity: 0.055;
    white-space: nowrap;
  }

  /* Motivo geométrico da categoria, sangrando pela direita. */
  .motif {
    position: absolute; right: -118px; top: 12px;
    width: 620px; height: 620px;
    transform: rotate(${rotation}deg);
  }

  /* Assinatura da marca, no canto superior esquerdo. */
  .brand {
    position: absolute; left: 80px; top: 64px;
    display: flex; align-items: center; gap: 14px;
  }
  .brand img { width: 54px; height: 54px; border-radius: 50%; display: block; }
  .brand span {
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700; font-size: 28px; letter-spacing: -0.4px;
    color: ${COVER_INK}; opacity: 0.85;
  }

  .kicker {
    position: absolute; left: 80px; top: 156px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 700; font-size: 23px; line-height: 1;
    letter-spacing: 3.2px; text-transform: uppercase;
    color: ${palette.kicker};
  }

  h1 {
    position: absolute; left: 80px; top: 206px; width: 646px;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    font-weight: 700;
    font-size: ${t.size}px;
    line-height: ${t.lh};
    letter-spacing: ${t.track}px;
    color: ${COVER_INK};
    text-wrap: balance;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="watermark">${escapeHtml(palette.word)}</div>
    <svg class="motif" viewBox="0 0 620 620" aria-hidden="true">${motif(category, palette.fg)}</svg>
    <div class="brand">
      <img src="${logoDataUri}" alt="" />
      <span>paca finance</span>
    </div>
    <div class="kicker">${escapeHtml(palette.label)}</div>
    <h1>${escapeHtml(title)}</h1>
  </div>
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

async function main() {
  if (!existsSync(CHROME)) {
    console.error(
      `[og] Chrome não encontrado em: ${CHROME}\n` +
        `     Instale o Google Chrome ou aponte CHROME_BIN para o binário.`,
    );
    process.exit(1);
  }

  const logoPath = join(PUBLIC_DIR, "logo-icon-large.png");
  const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  // Sem argumentos: gera tudo. Com argumentos: só os slugs pedidos (útil ao
  // iterar no visual). Ex.: node scripts/og.mjs planilha-gastos-casal
  const only = new Set(process.argv.slice(2));

  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const posts = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (only.size > 0 && !only.has(slug)) continue;
    const data = parseFrontmatter(readFileSync(join(CONTENT_DIR, file), "utf8"));
    if (!data) {
      console.warn(`[og] pulando ${file}: sem frontmatter`);
      continue;
    }
    if (data.draft === "true") {
      console.log(`[og] pulando ${slug}: draft`);
      continue;
    }
    if (!data.title || !COVER_PALETTES[data.category]) {
      console.warn(`[og] pulando ${file}: title/category inválidos`);
      continue;
    }
    posts.push({ slug, title: data.title, category: data.category });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "paca-og-"));

  let ok = 0;
  try {
    for (const post of posts) {
      const htmlPath = join(work, `${post.slug}.html`);
      const outPath = join(OUT_DIR, `${post.slug}.png`);
      rmSync(outPath, { force: true }); // não confundir sobra antiga com sucesso
      writeFileSync(htmlPath, cardHtml({ ...post, logoDataUri }), "utf8");

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
    `\n[og] ${ok}/${posts.length} imagens em public/og/ — lembre de commitar os PNGs.`,
  );
}

main().catch((err) => {
  console.error(`[og] falhou: ${err.message}`);
  process.exit(1);
});
