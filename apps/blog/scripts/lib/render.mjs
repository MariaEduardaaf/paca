/**
 * ENCANAMENTO COMPARTILHADO DOS DOIS GERADORES DE PNG DA CAPA
 *
 * Quem usa:
 *   - scripts/og.mjs    → card de compartilhamento (palavra gigante = TÍTULO);
 *   - scripts/capas.mjs → capa do site (palavra gigante = CATEGORIA).
 *
 * Os dois desenham a MESMA arte (src/lib/cover-art.mjs + src/styles/cover.css)
 * no mesmo Chrome headless, na mesma caixa de 1200x630. O que muda entre eles é
 * uma linha: o `mode` passado para `coverArt()`. Tudo o que sobra — achar o
 * Chrome, esperar o screenshot, ler o frontmatter, comprimir o PNG — é idêntico
 * e mora aqui, porque é onde estão as armadilhas: duplicar significaria alguém
 * consertar o timeout do Chrome num arquivo e não no outro.
 *
 * Nenhuma REGRA DE DESENHO entra aqui. A arte tem dono (cover-art.mjs +
 * cover.css) e continua tendo.
 *
 * REQUISITOS (os mesmos de sempre, sem dependência npm)
 *   - Node 18+
 *   - Google Chrome em /Applications/Google Chrome.app (ou CHROME_BIN)
 *   - Internet: as fontes vêm do Google Fonts com display=block
 *   - pngquant, opcional: se existir, comprime o PNG; se não, o PNG sai cru
 */

import { execFileSync, spawn } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

export const CHROME =
  process.env.CHROME_BIN ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Binário de compressão. Opcional de propósito — ver `optimizePng`. */
export const PNGQUANT = process.env.PNGQUANT_BIN || "pngquant";

/**
 * Rótulos das categorias — espelham `label` de src/lib/categories.ts, que é
 * TypeScript e um script Node puro não importa. É a ÚNICA coisa duplicada do
 * sistema de capas; se mudar um rótulo lá, mude aqui.
 */
export const CATEGORY_LABELS = {
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
export const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=block";

// ---------------------------------------------------------------------------
// Frontmatter (parser mínimo: só title / category / pubDate / draft)
// ---------------------------------------------------------------------------

export function parseFrontmatter(raw) {
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

/**
 * Lê todos os artigos publicados (sem draft), com o que a capa precisa.
 * @param {string} contentDir  pasta de src/content/blog
 * @param {string} tag         prefixo do log ("og" ou "capas")
 */
export function readPosts(contentDir, tag) {
  const files = readdirSync(contentDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const posts = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const data = parseFrontmatter(readFileSync(join(contentDir, file), "utf8"));
    if (!data) {
      console.warn(`[${tag}] pulando ${file}: sem frontmatter`);
      continue;
    }
    if (data.draft === "true") {
      console.log(`[${tag}] pulando ${slug}: draft`);
      continue;
    }
    if (!data.title || !CATEGORY_LABELS[data.category]) {
      console.warn(`[${tag}] pulando ${file}: title/category inválidos`);
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

// ---------------------------------------------------------------------------
// Página do screenshot
// ---------------------------------------------------------------------------

/**
 * A página do screenshot. O corpo é UM `.paca-cover` de 1200x630 — como ele é
 * a "container query" da folha compartilhada, `--u` vale exatamente 1px aqui e
 * cada número da spec cai no pixel do canvas.
 *
 * @param {{html: string, style: string, css: string}} opts
 *   `html` e `style` saem de `coverArt()`; `css` é src/styles/cover.css lido do disco.
 */
export function coverPageHtml({ html, style, css }) {
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

/**
 * Os dois PNGs do mascote como data URI. Precisa ser data URI porque o HTML do
 * screenshot mora num diretório temporário: um caminho relativo não acharia
 * nada em public/.
 */
export function mascotDataUris(publicDir) {
  const dataUri = (name) =>
    `data:image/png;base64,${readFileSync(join(publicDir, name)).toString("base64")}`;
  return {
    light: dataUri("paca-mascote.png"),
    dark: dataUri("paca-mascote-dark.png"),
  };
}

// ---------------------------------------------------------------------------
// Screenshot
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
export async function shoot({ htmlPath, outPath, profileDir }) {
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

// ---------------------------------------------------------------------------
// Compressão
// ---------------------------------------------------------------------------

/**
 * Comprime o PNG no lugar, com pngquant.
 *
 * POR QUE ISSO IMPORTA MAIS NA CAPA DO QUE NO CARD DE OG
 * O card de OG é baixado pelo WhatsApp/Facebook, uma vez, longe do leitor. A
 * capa é baixada pelo CELULAR de quem chegou do anúncio, e a home mostra dez de
 * uma vez — o peso vira custo por sessão comprada. O Chrome escreve PNG de 24
 * bits; a arte tem cinco cores chapadas e uma foto pequena do mascote, então
 * uma paleta de 256 cores corta ~75% do arquivo sem diferença visível.
 *
 * POR QUE O pngquant É OPCIONAL
 * É binário de sistema, não dependência npm (o projeto não aceita npm nova), e
 * quem clonar o repo pode não ter. Sem ele o PNG sai cru — mais pesado, nunca
 * quebrado. O chamador avisa uma vez, no fim.
 *
 * @returns {{before: number, after: number} | null} null = não comprimiu
 */
export function optimizePng(path) {
  const before = statSync(path).size;
  // Escreve num arquivo ao lado e só então substitui: pngquant lendo e
  // gravando o MESMO caminho deixaria um PNG truncado se ele falhasse no meio.
  const tmp = `${path}.pngquant`;
  try {
    execFileSync(
      PNGQUANT,
      [
        "--quality",
        // Piso 70: abaixo disso o degradê do mascote começa a bandear. Se o
        // pngquant não alcançar o piso ele sai com erro e a gente fica com o
        // PNG cru, que é o comportamento certo — nunca publicar arte pior.
        "70-96",
        "--speed",
        "1",
        "--strip",
        "--force",
        "--output",
        tmp,
        "--",
        path,
      ],
      { stdio: "ignore" },
    );
  } catch {
    rmSync(tmp, { force: true });
    return null;
  }

  const after = statSync(tmp).size;
  if (after >= before) {
    // Aconteceu? Então o arquivo cru já era menor. Fica com ele.
    rmSync(tmp, { force: true });
    return { before, after: before };
  }
  renameSync(tmp, path);
  return { before, after };
}

/** KB com uma casa, para os relatórios dos dois scripts. */
export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
