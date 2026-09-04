/**
 * Gerador das CAPAS do site — uma por artigo e uma por página de categoria.
 *
 * POR QUE ISSO EXISTE (é o item que vale dinheiro, não enfeite)
 * Até aqui a capa era desenhada em HTML/CSS dentro da página. Ficava linda e
 * era invisível para duas fontes de tráfego que este blog precisa:
 *   - Google Imagens: sem arquivo de imagem, não há o que indexar. Zero por
 *     construção, não por falta de audiência;
 *   - Discover: o card grande — o formato de maior volume barato em finanças
 *     pessoais — só aparece com uma imagem de 1200px de largura na página. A
 *     tag `max-image-preview:large` já está no ar em 32/32 páginas esperando
 *     por um arquivo que não existia.
 * Este script transforma a MESMA arte em public/capas/<slug>.png, e o
 * src/components/Cover.astro passa a apontar um <img> para ela. O desenho não
 * muda um pixel: é a mesma marcação (src/lib/cover-art.mjs), a mesma folha
 * (src/styles/cover.css) e o mesmo Chrome do card de compartilhamento.
 *
 * O NOME DO ARQUIVO É O SLUG, DE PROPÓSITO
 * Nome de arquivo é sinal de ranqueamento em busca de imagem. `hash-a91f.png`
 * não diz nada; `dividir-contas-proporcional-ao-salario.png` diz tudo. Por isso
 * nada de hash aqui, e por isso a pasta é plana: id de categoria e slug de
 * artigo vivem em espaços de nome distintos e não colidem.
 *
 * A DIFERENÇA PARA O scripts/og.mjs É UMA LINHA
 *   - aqui           → `mode: "category"`: a palavra gigante é a CATEGORIA,
 *     porque no site o título já está escrito logo ao lado do card e logo acima
 *     no topo do artigo;
 *   - scripts/og.mjs → `mode: "title"`: a palavra gigante é o TÍTULO, porque
 *     aquela imagem viaja sozinha pelo WhatsApp e precisa se explicar.
 * A dona escolheu essa divisão de propósito. Não troque os dois.
 *
 * QUANDO RODAR
 *   npm run capas         (dentro de apps/blog)
 * Rode sempre que:
 *   - publicar um artigo novo (ou tirar um post de draft);
 *   - mudar a `category` de um artigo já publicado;
 *   - criar uma categoria nova;
 *   - mexer em src/lib/cover-art.mjs ou src/styles/cover.css.
 * (Diferente do og: mudar só o TÍTULO não muda a capa do site, porque a palavra
 * gigante daqui é a categoria.) Depois de rodar, **comite os PNGs**.
 *
 * POR QUE OS PNGs SÃO VERSIONADOS
 * Mesmo motivo do og.mjs: o build da Vercel não tem Chrome headless e o projeto
 * não aceita dependência npm nova. Os PNGs entram no git como artefato de
 * conteúdo. Se faltar o PNG de um post, o Cover.astro cai sozinho no desenho
 * antigo em HTML/CSS e avisa no build — nunca quebra, mas também não indexa.
 *
 * REQUISITOS
 *   - Node 18+ (sem dependências npm)
 *   - Google Chrome em /Applications/Google Chrome.app (ou CHROME_BIN)
 *   - Internet: as fontes vêm do Google Fonts com display=block
 *   - pngquant (opcional): sem ele o PNG sai ~4x mais pesado, mas sai
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { auditCovers, coverAlt, coverArt } from "../src/lib/cover-art.mjs";
import {
  CATEGORY_LABELS,
  CHROME,
  coverPageHtml,
  kb,
  mascotDataUris,
  optimizePng,
  readPosts,
  shoot,
} from "./lib/render.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content", "blog");
const PUBLIC_DIR = join(ROOT, "public");
const OUT_DIR = join(PUBLIC_DIR, "capas");
const COVER_CSS_PATH = join(ROOT, "src", "styles", "cover.css");

/**
 * As páginas de categoria (/categorias e /categorias/<id>) também mostram uma
 * capa, e o Cover.astro é chamado lá com `slug = id da categoria` — é a
 * convenção documentada no componente. Então elas precisam do PNG delas, senão
 * seis páginas do site caem no fallback.
 */
const CATEGORY_TARGETS = Object.keys(CATEGORY_LABELS).map((id) => ({
  slug: id,
  category: id,
}));

function coverHtml({ category, slug, css, mascot }) {
  const { html, style } = coverArt({
    slug,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    mode: "category",
    mascot,
  });

  return coverPageHtml({ html, style, css });
}

async function main() {
  const posts = readPosts(CONTENT_DIR, "capas");

  // As mesmas regras que o og.mjs confere, e aqui elas importam ainda mais: é
  // ESTA imagem que aparece dez vezes na grade da home. Fundo repetido entre
  // vizinhos ou motivo repetido dentro da categoria param a execução.
  const { problems } = auditCovers(posts);
  if (problems.length > 0) {
    console.error(
      `[capas] o sistema de capas quebrou ${problems.length} regra(s):`,
    );
    for (const p of problems) console.error(`      ${p}`);
    process.exit(1);
  }

  if (!existsSync(CHROME)) {
    console.error(
      `[capas] Chrome não encontrado em: ${CHROME}\n` +
        `        Instale o Google Chrome ou aponte CHROME_BIN para o binário.`,
    );
    process.exit(1);
  }

  const mascot = mascotDataUris(PUBLIC_DIR);
  const css = readFileSync(COVER_CSS_PATH, "utf8");

  const all = [
    ...posts.map((p) => ({ slug: p.slug, category: p.category })),
    ...CATEGORY_TARGETS,
  ];

  // Sem argumentos: gera tudo. Com argumentos: só os slugs pedidos (útil ao
  // iterar no visual). Ex.: node scripts/capas.mjs planilha-gastos-casal
  const only = new Set(process.argv.slice(2));
  const targets = only.size > 0 ? all.filter((t) => only.has(t.slug)) : all;

  mkdirSync(OUT_DIR, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "paca-capas-"));

  let ok = 0;
  let bytes = 0;
  let raw = 0;
  let uncompressed = 0;

  try {
    for (const target of targets) {
      const htmlPath = join(work, `${target.slug}.html`);
      const outPath = join(OUT_DIR, `${target.slug}.png`);
      rmSync(outPath, { force: true }); // não confundir sobra antiga com sucesso
      writeFileSync(htmlPath, coverHtml({ ...target, css, mascot }), "utf8");

      await shoot({
        htmlPath,
        outPath,
        profileDir: join(work, `profile-${target.slug}`),
      });

      const gain = optimizePng(outPath);
      if (gain) {
        raw += gain.before;
        bytes += gain.after;
      } else {
        const size = statSync(outPath).size;
        raw += size;
        bytes += size;
        uncompressed++;
      }

      ok++;
      const alt = coverAlt({
        slug: target.slug,
        category: target.category,
        categoryLabel: CATEGORY_LABELS[target.category],
      });
      console.log(
        `[capas] ✓ ${target.slug}.png  ${kb(statSync(outPath).size).padStart(9)}  ${alt}`,
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  console.log(
    `\n[capas] ${ok}/${targets.length} capas em public/capas/ — ` +
      `${kb(bytes)} no total (cru: ${kb(raw)}), média ${kb(bytes / (ok || 1))}.`,
  );
  if (uncompressed > 0) {
    console.warn(
      `[capas] ${uncompressed} PNG(s) sem compressão: instale o pngquant ` +
        `(brew install pngquant) e rode de novo — o tráfego é ~90% celular.`,
    );
  }
  console.log("[capas] lembre de commitar os PNGs.");
}

main().catch((err) => {
  console.error(`[capas] falhou: ${err.message}`);
  process.exit(1);
});
