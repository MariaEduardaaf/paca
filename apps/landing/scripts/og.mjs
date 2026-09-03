/**
 * Gerador do card de compartilhamento (Open Graph) da landing.
 *
 * POR QUE ISSO EXISTE
 * Sem ele o apex compartilharia o og-default do blog, que é claro, tem a
 * palavra "blog" escrita e vende conteúdo, não o produto. São duas
 * propriedades diferentes com desenhos diferentes.
 *
 * MESMO ENCANAMENTO DO apps/blog
 * Chrome headless local, sem dependência npm nova, PNG versionado no git. O
 * motivo é o mesmo de lá: o build da Vercel não tem Chrome, então a imagem é
 * artefato de conteúdo — gerada aqui, comitada, servida estática.
 *
 * QUANDO RODAR DE NOVO
 *   npm run og            (dentro de apps/landing)
 * Rode se mudar o título/subtítulo do card ou a marca. Depois, comite o PNG.
 *
 * REQUISITOS
 *   - Node 18+
 *   - Google Chrome em /Applications/Google Chrome.app (ou CHROME_BIN)
 *   - Internet (a fonte vem do Google Fonts com display=block)
 *   - pngquant, opcional: se existir, comprime; se não, o PNG sai cru
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const OUT = join(PUBLIC_DIR, "og-default.png");

const CHROME =
  process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PNGQUANT = process.env.PNGQUANT_BIN || "pngquant";

// `display=block` porque screenshot não espera swap: com `swap` o card sairia
// na fonte de sistema.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=block";

/** O logo entra como data URI: o HTML do screenshot mora num diretório
 *  temporário e um caminho relativo não acharia o arquivo. */
function logoDataUri() {
  const bytes = readFileSync(join(PUBLIC_DIR, "logo-icon-96.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function cardHtml() {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link href="${FONTS_URL}" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    font-family:'Manrope',system-ui,sans-serif;
    background:#0A0A0F;color:#fff;position:relative;
    display:flex;flex-direction:column;justify-content:center;
    padding:72px 80px;
  }
  .orb{position:absolute;border-radius:50%;filter:blur(90px)}
  .o1{width:520px;height:520px;background:#FF8FB1;opacity:.42;top:-160px;right:-120px}
  .o2{width:420px;height:420px;background:#6366F1;opacity:.38;bottom:-180px;left:-100px}
  .o3{width:300px;height:300px;background:#A855F7;opacity:.24;top:44%;left:38%}
  .inner{position:relative;z-index:1}
  .brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800;letter-spacing:-.02em}
  .brand img{width:52px;height:52px;border-radius:15px;display:block}
  .brand .b2{color:#FF8FB1}
  /* Sem max-width em ch: com ele o <br> deixava de mandar e "sempre
     sincronizadas." quebrava em duas linhas no meio da palavra-chave. */
  h1{
    margin-top:44px;font-size:74px;line-height:1.04;letter-spacing:-.04em;font-weight:800;
    white-space:nowrap;
  }
  .grad{background:linear-gradient(110deg,#FF8FB1 0%,#818CF8 72%,#A855F7 100%);
        -webkit-background-clip:text;background-clip:text;color:transparent}
  p{margin-top:26px;font-size:27px;line-height:1.4;color:#C6CBD4;font-weight:600;max-width:30ch}
  .pill{
    position:absolute;right:80px;bottom:64px;z-index:1;
    padding:16px 28px;border-radius:999px;background:#FF8FB1;color:#0A0A0F;
    font-size:24px;font-weight:800;letter-spacing:-.01em;
  }
</style></head>
<body>
  <div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
  <div class="inner">
    <div class="brand">
      <img src="${logoDataUri()}" alt="">
      <span>paca<span class="b2">finance</span></span>
    </div>
    <h1>Finanças do casal,<br><span class="grad">sempre sincronizadas.</span></h1>
    <p>O app web em que as duas pessoas veem os mesmos números.</p>
  </div>
  <div class="pill">pacafinance.com.br</div>
</body></html>`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ARMADILHA REAL (a mesma documentada em apps/blog/scripts/lib/render.mjs):
 * o Chrome headless escreve o PNG do --screenshot mas NÃO encerra sozinho —
 * um execFileSync aqui travaria para sempre. Sobe solto, espera o arquivo
 * estabilizar e mata na mão.
 */
async function shoot(htmlPath, outPath, profileDir) {
  /*
   * APAGA O PNG ANTIGO ANTES DE COMEÇAR — e isto não é limpeza, é correção de
   * bug. A espera abaixo declara "pronto" quando o arquivo tem tamanho estável
   * por três leituras. Com o PNG da rodada anterior no lugar, essa condição já
   * nasce verdadeira: a função volta na primeira checagem, o Chrome é morto
   * antes de escrever e o script anuncia sucesso mostrando a imagem VELHA.
   * Aconteceu de verdade aqui: uma mudança no card não apareceu no PNG e o log
   * disse que tinha gerado.
   */
  rmSync(outPath, { force: true });

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
      "--virtual-time-budget=15000",
      "--window-size=1200,630",
      `--user-data-dir=${profileDir}`,
      `--screenshot=${outPath}`,
      `file://${htmlPath}`,
    ],
    { stdio: "ignore" }
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
        if (stableFor >= 3) return;
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

/** Comprime no lugar. Opcional: pngquant é binário de sistema, não npm. */
function optimizePng(path) {
  const before = statSync(path).size;
  const tmp = `${path}.pngquant`;
  try {
    execFileSync(PNGQUANT, ["--quality", "70-96", "--speed", "1", "--strip", "--force", "--output", tmp, path], {
      stdio: "ignore",
    });
  } catch {
    try {
      rmSync(tmp, { force: true });
    } catch {
      /* nada a limpar */
    }
    return null;
  }
  renameSync(tmp, path);
  return { before, after: statSync(path).size };
}

const work = mkdtempSync(join(tmpdir(), "paca-landing-og-"));
try {
  const htmlPath = join(work, "card.html");
  writeFileSync(htmlPath, cardHtml(), "utf8");
  await shoot(htmlPath, OUT, join(work, "chrome-profile"));

  const result = optimizePng(OUT);
  const size = statSync(OUT).size;
  if (result) {
    console.log(
      `og-default.png: ${(result.before / 1024).toFixed(0)} KB -> ${(result.after / 1024).toFixed(0)} KB`
    );
  } else {
    console.log(`og-default.png: ${(size / 1024).toFixed(0)} KB (pngquant ausente, PNG cru)`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
