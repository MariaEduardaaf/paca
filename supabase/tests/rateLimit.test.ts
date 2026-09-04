import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

import { checkRateLimit, rateLimitedResponse } from "../functions/_shared/rateLimit.ts";
import { createFakeSupabase } from "./helpers/fakeSupabase.ts";

const CONFIG = { action: "scan_receipt", windowSeconds: 60, max: 5 };

describe("checkRateLimit — freio por usuário nos endpoints pagos", () => {
  test("abaixo do máximo o uso é liberado e não há espera", async () => {
    const [client] = createFakeSupabase({ count: 4 });
    const result = await checkRateLimit(client, "profile-1", CONFIG);
    assert.deepEqual(result, { allowed: true, used: 4, limit: 5, retryAfterSeconds: 0 });
  });

  test("no máximo exato a próxima chamada é barrada", async () => {
    const [client] = createFakeSupabase({ count: 5 });
    const result = await checkRateLimit(client, "profile-1", CONFIG);
    assert.equal(result.allowed, false);
    assert.equal(result.used, 5);
  });

  test("ao barrar, informa quanto tempo esperar (o tamanho da janela)", async () => {
    const [client] = createFakeSupabase({ count: 9 });
    const result = await checkRateLimit(client, "profile-1", { ...CONFIG, windowSeconds: 300 });
    assert.equal(result.allowed, false);
    assert.equal(result.retryAfterSeconds, 300);
  });

  test("sem uso anterior (contagem nula) libera", async () => {
    const [client] = createFakeSupabase({ count: null });
    const result = await checkRateLimit(client, "profile-1", CONFIG);
    assert.equal(result.allowed, true);
    assert.equal(result.used, 0);
  });

  test("erro na contagem libera o uso (falha aberto) sem pedir espera", async () => {
    const [client] = createFakeSupabase({ count: 100, error: { message: "db down" } });
    const result = await checkRateLimit(client, "profile-1", CONFIG);
    assert.equal(result.allowed, true);
    assert.equal(result.used, 0);
    assert.equal(result.retryAfterSeconds, 0);
    assert.equal(result.limit, 5);
  });

  test("conta só o uso do próprio usuário e só da ação configurada", async () => {
    const [client, spy] = createFakeSupabase({ count: 1 });
    await checkRateLimit(client, "profile-42", { ...CONFIG, action: "advise_purchase" });
    const query = spy.onlyQuery();
    assert.equal(query.table, "usage_stats");
    assert.equal(spy.filterValue("eq", "profile_id"), "profile-42");
    assert.equal(spy.filterValue("eq", "action"), "advise_purchase");
    assert.equal(query.options?.head, true);
  });

  test("a janela olha exatamente para trás o tempo configurado", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 4, 10, 12, 0, 0) });
    try {
      const [client, spy] = createFakeSupabase({ count: 0 });
      await checkRateLimit(client, "profile-1", { ...CONFIG, windowSeconds: 900 });
      assert.equal(spy.filterValue("gte", "created_at"), "2026-05-10T11:45:00.000Z");
    } finally {
      mock.timers.reset();
    }
  });
});

describe("rateLimitedResponse — o que o app recebe ao ser freado", () => {
  test("responde 429 com Retry-After e preserva os cabeçalhos de CORS", async () => {
    const res = rateLimitedResponse(
      { allowed: false, used: 5, limit: 5, retryAfterSeconds: 60 },
      { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    );
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "60");
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
    const body = await res.json();
    assert.equal(body.retryAfter, 60);
    assert.equal(typeof body.error, "string");
  });
});
