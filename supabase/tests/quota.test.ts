import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

import {
  isPremium,
  checkMonthlyQuota,
  quotaExceededResponse,
} from "../functions/_shared/quota.ts";
import { createFakeSupabase } from "./helpers/fakeSupabase.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** ISO timestamp `offsetMs` away from now (negative = past). */
function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

/** Fake client whose subscriptions row is `row` (null = no subscription). */
function withSubscription(row: unknown) {
  return createFakeSupabase({ data: row });
}

describe("isPremium — quem é tratado como pagante", () => {
  test("assinatura ativa sem data de fim é premium (plano que não expira)", async () => {
    const [client] = withSubscription({ status: "active", current_period_end: null });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("trial sem data de fim é premium", async () => {
    const [client] = withSubscription({ status: "trialing", current_period_end: null });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("assinatura ativa com data de fim no futuro é premium", async () => {
    const [client] = withSubscription({
      status: "active",
      current_period_end: isoFromNow(30 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("trial com data de fim no futuro é premium", async () => {
    const [client] = withSubscription({
      status: "trialing",
      current_period_end: isoFromNow(2 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("vencida há 1 hora ainda é premium — tolerância de 24h absorve atraso do webhook", async () => {
    const [client] = withSubscription({
      status: "active",
      current_period_end: isoFromNow(-1 * HOUR),
    });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("vencida há 23h59 ainda é premium (dentro da tolerância)", async () => {
    const [client] = withSubscription({
      status: "active",
      current_period_end: isoFromNow(-(23 * HOUR + 59 * 60 * 1000)),
    });
    assert.equal(await isPremium(client, "couple-1"), true);
  });

  test("vencida há exatamente 24h já não é premium — a tolerância não é indefinida", async () => {
    const [client] = withSubscription({
      status: "active",
      current_period_end: isoFromNow(-DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("vencida há 48h não é premium — o status 'active' sozinho não segura o acesso", async () => {
    const [client] = withSubscription({
      status: "active",
      current_period_end: isoFromNow(-2 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("trial vencido há 48h não é premium", async () => {
    const [client] = withSubscription({
      status: "trialing",
      current_period_end: isoFromNow(-2 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("status cancelado não é premium nem com data de fim no futuro", async () => {
    const [client] = withSubscription({
      status: "canceled",
      current_period_end: isoFromNow(30 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("status expirado não é premium", async () => {
    const [client] = withSubscription({
      status: "expired",
      current_period_end: isoFromNow(30 * DAY),
    });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("casal sem linha de assinatura não é premium", async () => {
    const [client] = withSubscription(null);
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("erro ao ler a assinatura não concede premium (falha fechado)", async () => {
    const [client] = createFakeSupabase({ error: { message: "timeout" } });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("data de fim impossível de interpretar mantém o premium — o servidor confia no status", async () => {
    for (const impossivel of ["amanhã", "", "0000-13-45", "não sei"]) {
      const [client] = withSubscription({ status: "active", current_period_end: impossivel });
      assert.equal(
        await isPremium(client, "couple-1"),
        true,
        `data "${impossivel}" deveria cair no fallback de confiar no status`,
      );
    }
  });

  test("data impossível NÃO salva um status cancelado", async () => {
    const [client] = withSubscription({ status: "canceled", current_period_end: "amanhã" });
    assert.equal(await isPremium(client, "couple-1"), false);
  });

  test("consulta a assinatura do casal pedido, não de outro", async () => {
    const [client, spy] = withSubscription({ status: "active", current_period_end: null });
    await isPremium(client, "couple-abc");
    const query = spy.onlyQuery();
    assert.equal(query.table, "subscriptions");
    assert.deepEqual(query.filters, [{ op: "eq", column: "couple_id", value: "couple-abc" }]);
  });
});

describe("checkMonthlyQuota — a cota mensal do casal", () => {
  test("com 9 de 10 usados o próximo scan passa", async () => {
    const [client] = createFakeSupabase({ count: 9 });
    const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
    assert.equal(result.allowed, true);
    assert.equal(result.used, 9);
    assert.equal(result.limit, 10);
  });

  test("com 10 de 10 usados o 11º scan é bloqueado", async () => {
    const [client] = createFakeSupabase({ count: 10 });
    const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
    assert.equal(result.allowed, false);
    assert.equal(result.used, 10);
  });

  test("acima do limite continua bloqueado", async () => {
    const [client] = createFakeSupabase({ count: 47 });
    const { allowed } = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
    assert.equal(allowed, false);
  });

  test("limite zero bloqueia já no primeiro uso", async () => {
    const [client] = createFakeSupabase({ count: 0 });
    const { allowed } = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 0);
    assert.equal(allowed, false);
  });

  test("contagem nula é tratada como zero usos", async () => {
    const [client] = createFakeSupabase({ count: null });
    const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
    assert.equal(result.used, 0);
    assert.equal(result.allowed, true);
  });

  test("erro ao contar libera o uso (falha aberto) e não inventa consumo", async () => {
    const [client] = createFakeSupabase({ count: 999, error: { message: "enum não existe" } });
    const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
    assert.equal(result.allowed, true);
    assert.equal(result.used, 0);
    assert.equal(result.limit, 10);
  });

  test("conta só o uso do casal pedido e só das ações pedidas", async () => {
    const [client, spy] = createFakeSupabase({ count: 3 });
    await checkMonthlyQuota(client, "couple-xyz", ["scan_receipt", "scan_statement"], 10);
    const query = spy.onlyQuery();
    assert.equal(query.table, "usage_stats");
    assert.deepEqual(spy.filterValue("eq", "couple_id"), "couple-xyz");
    assert.deepEqual(spy.filterValue("in", "action"), ["scan_receipt", "scan_statement"]);
    assert.equal(query.options?.head, true);
    assert.equal(query.options?.count, "exact");
  });

  test("sem casal, mede por perfil", async () => {
    const [client, spy] = createFakeSupabase({ count: 1 });
    const result = await checkMonthlyQuota(client, null, ["translate_category"], 5, "profile-9");
    assert.equal(result.allowed, true);
    assert.equal(spy.filterValue("eq", "profile_id"), "profile-9");
    assert.equal(
      spy.onlyQuery().filters.some((f) => f.column === "couple_id"),
      false,
      "não deve filtrar por couple_id quando o escopo é o perfil",
    );
  });

  test("sem casal e sem perfil libera o uso sem consultar o banco", async () => {
    const [client, spy] = createFakeSupabase({ count: 99 });
    const result = await checkMonthlyQuota(client, null, ["translate_category"], 5);
    assert.equal(result.allowed, true);
    assert.equal(result.used, 0);
    assert.equal(spy.queries.length, 0, "não deveria ter consultado o banco");
  });

  test("a janela é o mês-calendário corrente em UTC, e o reset é o 1º do mês seguinte", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 2, 17, 13, 45, 0) });
    try {
      const [client, spy] = createFakeSupabase({ count: 2 });
      const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
      assert.equal(spy.filterValue("gte", "created_at"), "2026-03-01T00:00:00.000Z");
      assert.equal(result.resetAt, "2026-04-01T00:00:00.000Z");
    } finally {
      mock.timers.reset();
    }
  });

  test("no último instante do mês a janela ainda é o mês que está acabando", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 1, 28, 23, 59, 59, 999) });
    try {
      const [client, spy] = createFakeSupabase({ count: 10 });
      const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
      assert.equal(spy.filterValue("gte", "created_at"), "2026-02-01T00:00:00.000Z");
      assert.equal(result.resetAt, "2026-03-01T00:00:00.000Z");
      assert.equal(result.allowed, false, "ainda dentro do mês cheio, continua bloqueado");
    } finally {
      mock.timers.reset();
    }
  });

  test("na virada do mês a janela reinicia (o uso do mês anterior deixa de contar)", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 2, 1, 0, 0, 0) });
    try {
      const [client, spy] = createFakeSupabase({ count: 0 });
      const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
      assert.equal(spy.filterValue("gte", "created_at"), "2026-03-01T00:00:00.000Z");
      assert.equal(result.resetAt, "2026-04-01T00:00:00.000Z");
      assert.equal(result.allowed, true);
    } finally {
      mock.timers.reset();
    }
  });

  test("na virada do ano o reset aponta para janeiro do ano seguinte", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 11, 31, 23, 30, 0) });
    try {
      const [client, spy] = createFakeSupabase({ count: 1 });
      const result = await checkMonthlyQuota(client, "couple-1", ["scan_receipt"], 10);
      assert.equal(spy.filterValue("gte", "created_at"), "2026-12-01T00:00:00.000Z");
      assert.equal(result.resetAt, "2027-01-01T00:00:00.000Z");
    } finally {
      mock.timers.reset();
    }
  });
});

describe("quotaExceededResponse — o que o app recebe ao bater o teto", () => {
  test("responde 402 com o contexto da cota para o paywall", async () => {
    const res = quotaExceededResponse(
      { allowed: false, used: 10, limit: 10, resetAt: "2026-04-01T00:00:00.000Z" },
      { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    );
    assert.equal(res.status, 402);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
    const body = await res.json();
    assert.equal(body.code, "quota_exceeded");
    assert.equal(body.used, 10);
    assert.equal(body.limit, 10);
    assert.equal(body.resetAt, "2026-04-01T00:00:00.000Z");
  });
});
