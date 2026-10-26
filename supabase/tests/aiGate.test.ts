import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { reserveAiCall } from "../functions/_shared/aiGate.ts";

/** In-memory usage_stats + subscriptions; every op yields so concurrent calls interleave. */
function fakeDb(opts: { countError?: boolean; insertError?: boolean } = {}) {
  const rows: { id: number; profile_id: string; action: string; metadata?: unknown }[] = [];
  let seq = 0;
  const tick = () => new Promise((r) => setImmediate(r));
  const client = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let mode: "count" | "insert" | "delete" | "update" | "sub" = "count";
      let payload: Record<string, unknown> = {};
      const b: any = {
        insert(p: Record<string, unknown>) { mode = "insert"; payload = p; return b; },
        update(p: Record<string, unknown>) { mode = "update"; payload = p; return b; },
        delete() { mode = "delete"; return b; },
        select(_c: string, o?: { head?: boolean }) { if (table === "subscriptions") mode = "sub"; else if (o?.head) mode = "count"; return b; },
        eq(c: string, v: unknown) { filters[c] = v; return b; },
        in() { return b; },
        gte() { return b; },
        async single() {
          await tick();
          if (opts.insertError) return { data: null, error: { code: "X" } };
          const row = { id: ++seq, profile_id: String(payload.profile_id), action: String(payload.action) };
          rows.push(row);
          return { data: { id: row.id }, error: null };
        },
        async maybeSingle() { await tick(); return { data: null, error: null }; },
        then(ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) {
          return (async () => {
            await tick();
            if (mode === "delete") {
              const i = rows.findIndex((r) => r.id === filters.id);
              if (i >= 0) rows.splice(i, 1);
              return { error: null };
            }
            if (mode === "update") return { error: null };
            if (opts.countError) return { count: null, error: { code: "42P01" } };
            return { count: rows.filter((r) => r.profile_id === filters.profile_id && r.action === filters.action).length, error: null };
          })().then(ok, bad);
        },
      };
      return b;
    },
  };
  return { client: client as any, rows };
}

const profile = { id: "p1", couple_id: "c1" };
const cfg = { action: "scan_receipt", windowSeconds: 60, max: 3 };

describe("reserveAiCall — gate dos endpoints de IA paga", () => {
  test("erro ao contar => 503 e a IA não é chamada", async () => {
    const { client } = fakeDb({ countError: true });
    const r = await reserveAiCall(client, client, profile, cfg, {});
    assert.ok("response" in r);
    assert.equal(r.response.status, 503);
  });

  test("erro ao reservar => 503", async () => {
    const { client } = fakeDb({ insertError: true });
    const r = await reserveAiCall(client, client, profile, cfg, {});
    assert.ok("response" in r);
    assert.equal(r.response.status, 503);
  });

  test("rajada de 10 chamadas simultâneas com limite 3: no máximo 3 chegam na IA", async () => {
    const { client, rows } = fakeDb();
    let aiCalls = 0;
    const results = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const r = await reserveAiCall(client, client, profile, cfg, {});
        if ("response" in r) return r.response.status;
        aiCalls++;
        return 200;
      }),
    );
    assert.ok(aiCalls <= 3, `IA chamada ${aiCalls}x`);
    // ponytail: a fully simultaneous burst may block ALL of them (each sees the others' rows);
    // over-blocking is the safe side for cost, the user just retries.
    assert.ok(results.every((s) => s === 200 || s === 429));
    // rejeitadas liberam a reserva; só as que passaram ficam contadas
    assert.equal(rows.length, aiCalls);
  });

  test("depois do limite, nova chamada é 429; release devolve a vaga", async () => {
    const { client } = fakeDb();
    const gates = [];
    for (let i = 0; i < 3; i++) gates.push(await reserveAiCall(client, client, profile, cfg, {}));
    const over = await reserveAiCall(client, client, profile, cfg, {});
    assert.ok("response" in over);
    assert.equal(over.response.status, 429);
    const g = gates[0];
    assert.ok(!("response" in g));
    await g.release();
    const again = await reserveAiCall(client, client, profile, cfg, {});
    assert.ok(!("response" in again));
  });
});
