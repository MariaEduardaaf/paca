import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { convert, fetchRates } from "../functions/_shared/fx.ts";

const realFetch = globalThis.fetch;

interface FetchCall {
  url: string;
}

let calls: FetchCall[] = [];

/** Substitui o fetch global por uma resposta ditada pelo teste. */
function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  calls = [];
  // O contrato usado por fx.ts é só `res.ok` + `res.json()`; um Response real
  // cobre isso sem precisar de biblioteca de mock.
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    calls.push({ url });
    return await handler(url);
  }) as typeof globalThis.fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ratesResponse(rates: Record<string, number>): Response {
  return jsonResponse({ result: "success", rates });
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("convert — conversão de moeda do extrato", () => {
  test("converte usando a taxa retornada e arredonda para centavos inteiros", async () => {
    stubFetch(() => ratesResponse({ BRL: 5.5 }));
    const result = await convert(10_000, "USD", "BRL");
    assert.deepEqual(result, { converted: 55_000, rate: 5.5, ok: true });
  });

  test("arredonda meio centavo para cima em vez de truncar", async () => {
    stubFetch(() => ratesResponse({ BRL: 0.2 }));
    const result = await convert(333, "USD", "BRL"); // 66.6 centavos
    assert.equal(result.converted, 67);
    assert.equal(result.ok, true);
  });

  test("moeda de origem igual à de destino não faz chamada de câmbio", async () => {
    stubFetch(() => {
      throw new Error("não deveria buscar taxa quando as moedas são iguais");
    });
    const result = await convert(12_345, "BRL", "BRL");
    assert.deepEqual(result, { converted: 12_345, rate: 1, ok: true });
    assert.equal(calls.length, 0);
  });

  test("taxa ausente para a moeda de destino não converte e sinaliza ok=false", async () => {
    stubFetch(() => ratesResponse({ EUR: 0.9, GBP: 0.8 })); // sem BRL
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
    assert.equal(result.converted, 10_000, "o valor deve permanecer na moeda original");
    assert.equal(result.rate, 1);
  });

  test("resposta HTTP de erro sinaliza ok=false", async () => {
    stubFetch(() => jsonResponse({ result: "success", rates: { BRL: 5.5 } }, 429));
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
    assert.equal(result.converted, 10_000);
  });

  test("resposta sem result=success sinaliza ok=false mesmo trazendo taxas", async () => {
    stubFetch(() => jsonResponse({ result: "error", rates: { BRL: 5.5 } }));
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
    assert.equal(result.converted, 10_000);
  });

  test("resposta sem o campo de taxas sinaliza ok=false", async () => {
    stubFetch(() => jsonResponse({ result: "success" }));
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
  });

  test("corpo que não é JSON válido sinaliza ok=false em vez de estourar", async () => {
    stubFetch(() => new Response("<html>bad gateway</html>", { status: 200 }));
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
    assert.equal(result.converted, 10_000);
  });

  test("falha de rede sinaliza ok=false em vez de estourar", async () => {
    stubFetch(() => {
      throw new TypeError("network error");
    });
    const result = await convert(10_000, "USD", "BRL");
    assert.equal(result.ok, false);
    assert.equal(result.converted, 10_000);
  });

  test("taxa inválida (zero, negativa, não numérica, infinita) nunca é usada", async () => {
    for (const taxaRuim of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      stubFetch(() => ratesResponse({ BRL: taxaRuim as number }));
      const result = await convert(10_000, "USD", "BRL");
      assert.equal(result.ok, false, `taxa ${String(taxaRuim)} deveria ser rejeitada`);
      assert.equal(result.converted, 10_000);
      assert.equal(result.rate, 1);
    }
  });

  test("nenhum caminho de falha devolve valor convertido com ok=true", async () => {
    const cenariosDeFalha: Array<[string, () => Response]> = [
      ["HTTP 500", () => jsonResponse({ result: "success", rates: { BRL: 5.5 } }, 500)],
      ["result de erro", () => jsonResponse({ result: "error" })],
      ["sem rates", () => jsonResponse({ result: "success" })],
      ["rates vazio", () => ratesResponse({})],
      ["moeda ausente", () => ratesResponse({ EUR: 0.9 })],
      ["taxa zero", () => ratesResponse({ BRL: 0 })],
      ["corpo inválido", () => new Response("nope")],
      ["payload nulo", () => jsonResponse(null)],
    ];

    for (const [nome, resposta] of cenariosDeFalha) {
      stubFetch(resposta);
      const result = await convert(9_999, "USD", "BRL");
      assert.equal(result.ok, false, `${nome}: deveria reportar falha`);
      assert.equal(
        result.converted,
        9_999,
        `${nome}: não pode devolver valor convertido em cima de taxa inexistente`,
      );
      assert.equal(result.rate, 1, `${nome}: não pode inventar taxa`);
    }
  });

  test("com cache, a mesma moeda de origem é buscada uma única vez", async () => {
    stubFetch(() => ratesResponse({ BRL: 5.0, EUR: 0.9 }));
    const cache = new Map<string, Record<string, number>>();
    const a = await convert(1_000, "USD", "BRL", cache);
    const b = await convert(2_000, "USD", "BRL", cache);
    assert.equal(a.converted, 5_000);
    assert.equal(b.converted, 10_000);
    assert.equal(calls.length, 1, "a segunda conversão deve reaproveitar o cache");
  });

  test("moedas de origem diferentes são buscadas separadamente", async () => {
    stubFetch((url) =>
      url.includes("/USD") ? ratesResponse({ BRL: 5.0 }) : ratesResponse({ BRL: 6.0 })
    );
    const cache = new Map<string, Record<string, number>>();
    const usd = await convert(1_000, "USD", "BRL", cache);
    const eur = await convert(1_000, "EUR", "BRL", cache);
    assert.equal(usd.converted, 5_000);
    assert.equal(eur.converted, 6_000);
    assert.equal(calls.length, 2);
  });

  test("uma falha em cache não vira conversão silenciosa na chamada seguinte", async () => {
    let primeiraChamada = true;
    stubFetch(() => {
      const res = primeiraChamada
        ? jsonResponse({ result: "error" })
        : ratesResponse({ BRL: 5.0 });
      primeiraChamada = false;
      return res;
    });
    const cache = new Map<string, Record<string, number>>();
    const a = await convert(1_000, "USD", "BRL", cache);
    const b = await convert(1_000, "USD", "BRL", cache);
    assert.equal(a.ok, false);
    assert.equal(b.ok, false, "o cache negativo não pode virar sucesso sem nova taxa válida");
    assert.equal(b.converted, 1_000);
  });

  test("valor zero converte para zero sem marcar falha", async () => {
    stubFetch(() => ratesResponse({ BRL: 5.5 }));
    const result = await convert(0, "USD", "BRL");
    assert.deepEqual(result, { converted: 0, rate: 5.5, ok: true });
  });

  test("valor negativo (estorno) mantém o sinal na conversão", async () => {
    stubFetch(() => ratesResponse({ BRL: 5.0 }));
    const result = await convert(-2_500, "USD", "BRL");
    assert.equal(result.converted, -12_500);
    assert.equal(result.ok, true);
  });
});

describe("fetchRates — busca das taxas", () => {
  test("devolve o mapa de taxas quando a resposta é válida", async () => {
    stubFetch(() => ratesResponse({ BRL: 5.5, EUR: 0.9 }));
    assert.deepEqual(await fetchRates("USD"), { BRL: 5.5, EUR: 0.9 });
  });

  test("consulta a moeda base pedida", async () => {
    stubFetch(() => ratesResponse({ USD: 0.18 }));
    await fetchRates("BRL");
    assert.match(calls[0].url, /\/BRL$/);
  });

  test("qualquer falha vira mapa vazio, nunca exceção", async () => {
    for (const resposta of [
      () => jsonResponse({}, 500),
      () => jsonResponse({ result: "error" }),
      () => new Response("not json"),
      () => {
        throw new Error("dns");
      },
    ]) {
      stubFetch(resposta as () => Response);
      assert.deepEqual(await fetchRates("USD"), {});
    }
  });
});
