import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { timingSafeEqualStr } from "../functions/_shared/crypto.ts";

describe("timingSafeEqualStr — comparação de segredo compartilhado", () => {
  test("segredos iguais são aceitos", () => {
    assert.equal(timingSafeEqualStr("whsec_abc123", "whsec_abc123"), true);
  });

  test("segredos diferentes são recusados", () => {
    assert.equal(timingSafeEqualStr("whsec_abc123", "whsec_xyz789"), false);
  });

  test("diferença só no PRIMEIRO byte é recusada", () => {
    assert.equal(timingSafeEqualStr("Xbcdef", "abcdef"), false);
  });

  test("diferença só no ÚLTIMO byte é recusada — a comparação não pode parar no meio", () => {
    assert.equal(timingSafeEqualStr("abcdeX", "abcdef"), false);
  });

  test("tamanhos diferentes são recusados (prefixo correto não basta)", () => {
    assert.equal(timingSafeEqualStr("abc", "abcdef"), false);
    assert.equal(timingSafeEqualStr("abcdef", "abc"), false);
  });

  test("dois vazios são iguais", () => {
    assert.equal(timingSafeEqualStr("", ""), true);
  });

  test("vazio contra segredo real é recusado nos dois sentidos", () => {
    assert.equal(timingSafeEqualStr("", "whsec_abc123"), false);
    assert.equal(timingSafeEqualStr("whsec_abc123", ""), false);
  });

  test("compara bytes UTF-8, não unidades de código — 'é' não passa por 'ab'", () => {
    // "é" e "ab" ocupam 2 bytes em UTF-8; sem comparar bytes de verdade,
    // um teste ingênuo de tamanho poderia empatar.
    assert.equal(timingSafeEqualStr("é", "ab"), false);
    assert.equal(timingSafeEqualStr("segredo-é-ü", "segredo-é-ü"), true);
    assert.equal(timingSafeEqualStr("segredo-é", "segredo-e"), false);
  });

  test("mesmo número de caracteres com número DIFERENTE de bytes é recusado", () => {
    // Este é o caso que separa a comparação de bytes da comparação de chars:
    // "é" e "a" têm 1 caractere cada, mas 2 e 1 byte. Se o guarda de tamanho
    // olhasse `a.length` em vez do buffer, o laço leria além do buffer curto,
    // `undefined` viraria NaN no XOR, o acumulador continuaria zero e os dois
    // segredos passariam como IGUAIS — bypass de autenticação.
    assert.equal(timingSafeEqualStr("é", "a"), false);
    assert.equal(timingSafeEqualStr("a", "é"), false);
    assert.equal(timingSafeEqualStr("whsec_ção", "whsec_cao"), false);
    assert.equal(timingSafeEqualStr("🔑", "ab"), false, "1 char de 4 bytes vs 2 chars de 2 bytes");
  });

  test("o acumulador nunca vira NaN — comprimentos desiguais não podem devolver true", () => {
    // Varre pares em que o tamanho em bytes difere de 1 a 4. Nenhum pode passar.
    const base = "whsec_" + "k".repeat(20);
    for (let corte = 1; corte <= 4; corte++) {
      assert.equal(timingSafeEqualStr(base, base.slice(0, -corte)), false, `corte ${corte}`);
      assert.equal(timingSafeEqualStr(base.slice(0, -corte), base), false, `corte ${corte} invertido`);
    }
  });

  test("espaço em branco na ponta não é ignorado", () => {
    assert.equal(timingSafeEqualStr("whsec_abc ", "whsec_abc"), false);
  });

  test("diferença de apenas um bit é recusada", () => {
    // 'a' (0x61) vs '`' (0x60): um único bit de diferença.
    assert.equal(timingSafeEqualStr("a", "`"), false);
  });

  test("aceita segredo longo idêntico e recusa o mesmo com um byte trocado no meio", () => {
    const secret = "k".repeat(64);
    assert.equal(timingSafeEqualStr(secret, "k".repeat(64)), true);
    const tampered = `${"k".repeat(32)}K${"k".repeat(31)}`;
    assert.equal(timingSafeEqualStr(secret, tampered), false);
  });
});
