/**
 * Testa a conta da calculadora de desconto real e parcelado sem juros
 * (src/lib/desconto.mjs). Node puro, sem framework.
 *
 * Rode:  npm run testa:desconto
 */
import assert from "node:assert/strict";
import { descontoReal, parcelado, parseBR } from "../src/lib/desconto.mjs";

const perto = (real, esperado, tol, nome) =>
  assert.ok(Math.abs(real - esperado) <= tol, `${nome}: ${real} fora de ${esperado} +-${tol}`);
const limpo = (o) =>
  Object.values(o).forEach((v) => assert.ok(typeof v !== "number" || isFinite(v), `NaN/Infinity em ${JSON.stringify(o)}`));

// Exemplo do artigo: R$ 3.040 à vista ou 10 x R$ 320
const a = parcelado({ avista: 3040, n: 10, parcela: 320 });
assert.equal(a.total, 3200);
assert.equal(a.extra, 160);
perto(a.mensal, 0.94, 0.01, "mensal");
perto(a.anual, 11.9, 0.1, "anual");
assert.equal(a.veredito, "com-juros");

// Total igual ao à vista: sem juros de verdade
const b = parcelado({ avista: 3000, n: 10, parcela: 300 });
assert.equal(b.mensal, 0);
assert.equal(b.anual, 0);
assert.equal(b.veredito, "sem-juros");

// Parcelar sai mais barato: sem taxa para mostrar
const c = parcelado({ avista: 3200, n: 10, parcela: 300 });
assert.equal(c.veredito, "mais-barato");
assert.equal(c.extra, -200);
assert.equal(c.mensal, null);

// Juro absurdo não vira Infinity
const d = parcelado({ avista: 10, n: 2, parcela: 1000 });
assert.equal(d.veredito, "juro-absurdo");
limpo(d);

// Entradas inválidas: null, nunca NaN
for (const x of [
  { avista: 0, n: 10, parcela: 320 },
  { avista: -5, n: 10, parcela: 320 },
  { avista: 3040, n: 1, parcela: 3040 },
  { avista: 3040, n: 0, parcela: 320 },
  { avista: 3040, n: 2.5, parcela: 320 },
  { avista: 3040, n: 10, parcela: 0 },
  { avista: NaN, n: 10, parcela: 320 },
  { avista: null, n: 10, parcela: 320 },
]) assert.equal(parcelado(x), null, JSON.stringify(x));

// Desconto: 1000 -> 800, menor 820
const e = descontoReal({ de: 1000, por: 800, menor: 820 });
perto(e.anunciadoPct, 20, 0.001, "anunciado");
perto(e.realPct, 2.44, 0.005, "real");
assert.equal(e.realRs, 20);
assert.equal(e.veredito, "inflado");

// Desconto de verdade: o "de" não passa do menor preço
assert.equal(descontoReal({ de: 820, por: 700, menor: 820 }).veredito, "real");

// por 900 com menor 850: não é desconto (real negativo)
const f = descontoReal({ de: 1200, por: 900, menor: 850 });
assert.equal(f.veredito, "sem-desconto");
assert.equal(f.realRs, -50);
assert.ok(f.realPct < 0);

// Igual ao menor preço: zero, não é desconto
assert.equal(descontoReal({ de: 1000, por: 800, menor: 800 }).veredito, "sem-desconto");

// Sem o menor preço: só o anunciado
const g = descontoReal({ de: 1000, por: 800, menor: null });
assert.equal(g.veredito, "so-anunciado");
assert.equal(g.realPct, null);
assert.equal(descontoReal({ de: 1000, por: 1000, menor: null }).veredito, "sem-desconto");

// Entradas inválidas
for (const x of [
  { de: 0, por: 800, menor: 820 },
  { de: 1000, por: 0, menor: 820 },
  { de: -1, por: 800, menor: null },
  { de: NaN, por: 800, menor: null },
]) assert.equal(descontoReal(x), null, JSON.stringify(x));
limpo(descontoReal({ de: 1000, por: 800, menor: 0 })); // menor 0 = ignorado
assert.equal(descontoReal({ de: 1000, por: 800, menor: 0 }).veredito, "so-anunciado");

// Leitura de números no formato brasileiro
assert.equal(parseBR("3.040,00"), 3040);
assert.equal(parseBR("R$ 3.040"), 3040);
assert.equal(parseBR("3040.5"), 3040.5);
assert.equal(parseBR(""), null);
assert.ok(Number.isNaN(parseBR("abc")));

console.log("testa-desconto: tudo ok");
console.log(`  exemplo do artigo: +R$ ${a.extra}, ${a.mensal.toFixed(2)}% a.m., ${a.anual.toFixed(1)}% a.a.`);
console.log(`  1000/800/820: anunciado ${e.anunciadoPct}%, real ${e.realPct.toFixed(2)}% (${e.veredito})`);
