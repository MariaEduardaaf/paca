/**
 * Testa a SAÍDA DA MEDIÇÃO — o opt-out do Meta Pixel.
 *
 * POR QUE ISTO EXISTE. O repo não tem suíte de teste, e mesmo assim esta parte
 * ganhou uma: ela é código de conformidade, e é do tipo que quebra calado. Um
 * `npm run build` continua verde se alguém mexer no snippet do pixel e a
 * escolha do leitor parar de ser respeitada — nenhuma página falha, nenhum
 * typecheck reclama, e o site segue medindo quem pediu para não ser medido.
 * É o mesmo motivo do `auditCovers()`: já quebrou calado uma vez.
 *
 * O QUE ELE TESTA. Não a fonte: o JavaScript que o BUILD EMITIU, lido de
 * `dist/`. O snippet do pixel nasce de uma template string no BaseLayout e o
 * script do botão passa pelo `define:vars` do Astro — testar o `.astro` deixaria
 * de fora justamente as duas transformações que podem estragar tudo.
 *
 * Rode depois do build:  npm run build && npm run testa:medicao
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

if (!existsSync(join(DIST, "index.html"))) {
  console.error("[medicao] dist/ não existe — rode `npm run build` antes.");
  process.exit(1);
}

/** Extrai do HTML o <script> que contém uma marca. */
function extrai(arquivo, marca) {
  const html = readFileSync(join(DIST, arquivo), "utf8");
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  const achado = scripts.find((s) => s.includes(marca));
  if (!achado) {
    console.error(
      `[medicao] não achei em ${arquivo} o script com "${marca}". ` +
        `Se o snippet mudou de forma, este teste precisa mudar junto — ` +
        `não apague a asserção, conserte a busca.`,
    );
    process.exit(1);
  }
  return achado;
}

let falhas = 0;
function confere(nome, real, esperado) {
  const ok = String(real).includes(String(esperado));
  if (!ok) falhas++;
  console.log(
    `  ${ok ? "ok  " : "FALHA"} ${nome.padEnd(46)}${ok ? "" : ` → ${JSON.stringify(String(real).slice(0, 80))}`}`,
  );
}

// ---------------------------------------------------------------------------
// 1. O GUARD: em que situações o fbevents.js é carregado
// ---------------------------------------------------------------------------

const SNIPPET = extrai("index.html", "pacaSemMedicao");

function rodaGuard({ hostname, storage }) {
  const carregados = [];
  const tag = {
    set src(v) {
      carregados.push(v);
    },
    get src() {
      return "";
    },
  };
  const ctx = {
    document: {
      createElement: () => tag,
      getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
    },
    location: { hostname },
    localStorage: {
      getItem(k) {
        if (storage === "lanca") throw new Error("SecurityError");
        return storage[k] ?? null;
      },
    },
  };
  vm.createContext(ctx);
  // No navegador `window` É o objeto global: `f.fbq = ...` cria uma global e a
  // chamada nua `fbq(...)` a encontra. Sem esta linha o stub separa os dois e o
  // snippet estoura — falha do teste, não do código.
  ctx.window = ctx;
  vm.runInContext(SNIPPET, ctx);
  return carregados.length > 0;
}

const HOST = "blog.pacafinance.com.br";
console.log("\nO guard do pixel (carrega o fbevents.js?)");
const CASOS = [
  ["host rastreado, sem opt-out", { hostname: HOST, storage: {} }, true],
  ["host rastreado, COM opt-out", { hostname: HOST, storage: { paca_sem_medicao: "1" } }, false],
  // Falha ABERTA de propósito: quem não pode gravar nunca registrou escolha
  // aqui, e tratar "não consegui ler" como "saiu" apagaria da medição todo
  // mundo com dados de site bloqueados — e é essa medição que decide o gasto.
  ["host rastreado, localStorage lança", { hostname: HOST, storage: "lanca" }, true],
  ["host rastreado, valor lixo guardado", { hostname: HOST, storage: { paca_sem_medicao: "sim" } }, true],
  ["localhost", { hostname: "localhost", storage: {} }, false],
  ["preview da Vercel", { hostname: "paca-blog-abc.vercel.app", storage: {} }, false],
];
for (const [nome, cfg, esperado] of CASOS) {
  confere(nome, String(rodaGuard(cfg)), String(esperado));
}

// ---------------------------------------------------------------------------
// 2. O BOTÃO da página de privacidade
// ---------------------------------------------------------------------------

const BOTAO = extrai(join("privacidade", "index.html"), "medicao-botao");

function elemento(id) {
  return {
    id,
    textContent: "",
    hidden: id === "medicao-botao",
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    addEventListener(tipo, fn) {
      if (tipo === "click") this.click = fn;
    },
  };
}

function montaBotao({ inicial, bloqueado }) {
  const els = {
    "medicao-estado": elemento("medicao-estado"),
    "medicao-botao": elemento("medicao-botao"),
    "medicao-nota": elemento("medicao-nota"),
  };
  const guardado = { ...inicial };
  const ctx = {
    document: { getElementById: (id) => els[id] || null },
    localStorage: {
      getItem(k) {
        if (bloqueado) throw new Error("bloqueado");
        return guardado[k] ?? null;
      },
      setItem(k, v) {
        if (bloqueado) throw new Error("bloqueado");
        guardado[k] = v;
      },
      removeItem(k) {
        if (bloqueado) throw new Error("bloqueado");
        delete guardado[k];
      },
    },
  };
  vm.createContext(ctx);
  ctx.window = ctx;
  vm.runInContext(BOTAO, ctx);
  return { els, guardado };
}

console.log("\nO botão, começando com a medição LIGADA");
let c = montaBotao({ inicial: {}, bloqueado: false });
confere("diz que está ligada", c.els["medicao-estado"].textContent, "está ligada");
confere("oferece desligar", c.els["medicao-botao"].textContent, "Desligar");
confere("o botão aparece", String(c.els["medicao-botao"].hidden), "false");
confere("aria-pressed começa false", c.els["medicao-botao"].attrs["aria-pressed"], "false");

c.els["medicao-botao"].click();
confere("o clique grava a chave", c.guardado["paca_sem_medicao"], "1");
confere("o estado vira DESLIGADA", c.els["medicao-estado"].textContent, "DESLIGADA");
confere("avisa que vale na próxima página", c.els["medicao-estado"].textContent, "próxima página");
confere("passa a oferecer religar", c.els["medicao-botao"].textContent, "Ligar a medição de novo");
confere("aria-pressed vira true", c.els["medicao-botao"].attrs["aria-pressed"], "true");

c.els["medicao-botao"].click();
confere("o 2º clique apaga a chave", String(c.guardado["paca_sem_medicao"] === undefined), "true");
confere("o estado volta para ligada", c.els["medicao-estado"].textContent, "está ligada");

console.log("\nO botão, com a escolha JÁ guardada de antes");
c = montaBotao({ inicial: { paca_sem_medicao: "1" }, bloqueado: false });
confere("reconhece a escolha anterior", c.els["medicao-estado"].textContent, "DESLIGADA");
confere("oferece religar", c.els["medicao-botao"].textContent, "Ligar a medição de novo");

console.log("\nO botão, com o navegador BLOQUEANDO o armazenamento");
c = montaBotao({ inicial: {}, bloqueado: true });
confere("explica que não dá para guardar", c.els["medicao-estado"].textContent, "Não foi possível guardar");
confere("não mostra botão que não funciona", String(c.els["medicao-botao"].hidden), "true");
confere("aponta o caminho que funciona", c.els["medicao-nota"].textContent, "bloqueio do próprio navegador");

if (falhas > 0) {
  console.error(`\n[medicao] ${falhas} asserção(ões) falharam.`);
  process.exit(1);
}
console.log("\n[medicao] tudo certo — o leitor que pediu para sair continua fora.");
