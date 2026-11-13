/**
 * A conta da calculadora de desconto real e parcelado sem juros.
 *
 * Funções puras, sem DOM: a página importa daqui e o scripts/testa-desconto.mjs
 * roda a mesma coisa em Node. Mesma conta do artigo /blog/black-friday-casal
 * (desconto sobre o menor preço dos últimos 60 dias; geladeira de R$ 3.040 à
 * vista ou 10 x R$ 320 = 0,94% ao mês). Se um mudar, o outro muda junto.
 *
 * Toda função devolve `null` quando falta ou sobra dado, nunca NaN/Infinity.
 */

const cents = (n) => Math.round(n * 100) / 100;
const ok = (n) => typeof n === "number" && isFinite(n);

/**
 * Aceita como a pessoa escreve no Brasil: "1.234,56", "1234,56", "1234.56",
 * "R$ 3.000" e "3000". Um único ponto com 3 casas depois (3.000) é milhar.
 * null = vazio, NaN = não é número, número = ok.
 */
export function parseBR(bruto) {
  const raw = String(bruto == null ? "" : bruto).trim();
  if (!raw) return null;
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return NaN;
  const negativo = s.includes("-");
  s = s.replace(/-/g, "");
  if (!s) return NaN;
  if (s.includes(",")) {
    const partes = s.split(",");
    const dec = partes.pop();
    s = partes.join("").replace(/\./g, "") + "." + dec.replace(/\./g, "");
  } else if (s.includes(".")) {
    const pontos = s.split(".").length - 1;
    const casas = s.length - s.lastIndexOf(".") - 1;
    if (pontos > 1 || casas === 3) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return NaN;
  return negativo ? -n : n;
}

/**
 * Bloco A. `de` = preço anunciado, `por` = preço agora, `menor` = menor preço
 * dos últimos 60 dias (opcional: null).
 * veredito: "sem-desconto" | "inflado" | "real" | "so-anunciado" (sem `menor`).
 */
export function descontoReal({ de, por, menor }) {
  if (!ok(de) || !ok(por) || de <= 0 || por <= 0) return null;
  const anunciadoRs = cents(de - por);
  const anunciadoPct = (anunciadoRs / de) * 100;
  /** @type {{ anunciadoRs: number, anunciadoPct: number, realRs: number | null, realPct: number | null, veredito: string }} */
  const r = { anunciadoRs, anunciadoPct, realRs: null, realPct: null, veredito: "so-anunciado" };
  if (ok(menor) && menor > 0) {
    // Positivo = desconto de verdade; zero ou negativo = não é desconto.
    r.realRs = cents(menor - por);
    r.realPct = (r.realRs / menor) * 100;
    if (r.realRs <= 0) r.veredito = "sem-desconto";
    else if (cents(de - menor) > 0) r.veredito = "inflado"; // "metade do dobro"
    else r.veredito = "real";
  } else if (anunciadoRs <= 0) {
    r.veredito = "sem-desconto";
  }
  return r;
}

/**
 * Bloco B. Taxa mensal i em: avista = parcela * (1 - (1 + i)^-n) / i, com a
 * primeira parcela um mês depois da compra. Bisseção: a função é decrescente
 * em i, então não precisa de derivada nem de chute inicial.
 * Devolve { total, extra, mensal, anual, veredito } com veredito
 * "sem-juros" | "mais-barato" | "com-juros" | "juro-absurdo" (mensal > 100%).
 */
export function parcelado({ avista, n, parcela }) {
  if (!ok(avista) || !ok(n) || !ok(parcela)) return null;
  if (avista <= 0 || parcela <= 0 || !Number.isInteger(n) || n < 2) return null;
  const total = cents(parcela * n);
  const extra = cents(total - avista);
  /** @type {{ total: number, extra: number, mensal: number | null, anual: number | null, veredito: string }} */
  const r = { total, extra, mensal: null, anual: null, veredito: "com-juros" };
  if (extra === 0) return { ...r, mensal: 0, anual: 0, veredito: "sem-juros" };
  if (extra < 0) return { ...r, veredito: "mais-barato" };

  const valorPresente = (i) => (parcela * (1 - Math.pow(1 + i, -n))) / i;
  let lo = 1e-12;
  let hi = 1;
  if (valorPresente(hi) > avista) return { ...r, veredito: "juro-absurdo" };
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (valorPresente(mid) > avista) lo = mid;
    else hi = mid;
  }
  const i = (lo + hi) / 2;
  r.mensal = i * 100;
  r.anual = (Math.pow(1 + i, 12) - 1) * 100;
  return r;
}
