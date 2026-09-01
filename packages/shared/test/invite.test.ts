import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isValidInviteCode, normalizeInviteCode } from "../src/utils/invite";
import {
  INVITE_CODE_PREFIX,
  INVITE_CODE_MIN_LENGTH,
  INVITE_CODE_MAX_LENGTH,
} from "../src/constants/categories";

describe("isValidInviteCode — formato legado (4 caracteres) e novo (10)", () => {
  it("aceita o código legado de 4 caracteres, que casais antigos ainda têm", () => {
    assert.equal(isValidInviteCode("PACA-ABCD"), true);
  });

  it("aceita o código novo de 10 caracteres gerado pelo servidor", () => {
    assert.equal(isValidInviteCode("PACA-A2B3C4D5E6"), true);
  });

  it("aceita todos os comprimentos entre o mínimo e o máximo", () => {
    const alfabeto = "ABCDEFGHJK";
    for (let n = INVITE_CODE_MIN_LENGTH; n <= INVITE_CODE_MAX_LENGTH; n++) {
      const codigo = `${INVITE_CODE_PREFIX}-${alfabeto.slice(0, n)}`;
      assert.equal(isValidInviteCode(codigo), true, codigo);
    }
  });

  it("rejeita código curto demais (3 caracteres)", () => {
    assert.equal(isValidInviteCode("PACA-ABC"), false);
  });

  it("rejeita código longo demais (11 caracteres)", () => {
    assert.equal(isValidInviteCode("PACA-ABCDEFGHJKM"), false);
  });
});

describe("isValidInviteCode — maiúsculas, minúsculas e ruído", () => {
  it("aceita o código digitado em minúsculas", () => {
    assert.equal(isValidInviteCode("paca-abcd"), true);
    assert.equal(isValidInviteCode("paca-a2b3c4d5e6"), true);
  });

  it("aceita capitalização misturada", () => {
    assert.equal(isValidInviteCode("Paca-AbCd"), true);
  });

  it("NÃO aceita espaço em volta — a validação não faz trim (é para isso que existe normalizeInviteCode)", () => {
    assert.equal(isValidInviteCode(" PACA-ABCD"), false);
    assert.equal(isValidInviteCode("PACA-ABCD "), false);
    assert.equal(isValidInviteCode(normalizeInviteCode(" paca-abcd ")), true);
  });

  it("rejeita espaço no meio do código", () => {
    assert.equal(isValidInviteCode("PACA-AB CD"), false);
  });
});

describe("isValidInviteCode — formato inválido", () => {
  const invalidos: Array<[string, string]> = [
    ["string vazia", ""],
    ["só o prefixo", "PACA"],
    ["prefixo sem hífen", "PACAABCD"],
    ["prefixo errado", "PACO-ABCD"],
    ["sem prefixo", "ABCD"],
    ["hífen trocado por underscore", "PACA_ABCD"],
    ["hífen duplicado", "PACA--ABCD"],
    ["hífen dentro do corpo", "PACA-AB-CD"],
    ["dois códigos concatenados", "PACA-ABCDPACA-ABCD"],
    ["caractere acentuado", "PACA-ABCÃ"],
    ["símbolo no corpo", "PACA-AB#D"],
    ["prefixo com espaço", "PAC A-ABCD"],
  ];

  for (const [nome, codigo] of invalidos) {
    it(`rejeita ${nome} (${JSON.stringify(codigo)})`, () => {
      assert.equal(isValidInviteCode(codigo), false);
    });
  }

  it("rejeita os caracteres ambíguos que o alfabeto exclui (I, O, 0, 1)", () => {
    for (const ambiguo of ["I", "O", "0", "1"]) {
      const codigo = `PACA-ABC${ambiguo}`;
      assert.equal(isValidInviteCode(codigo), false, codigo);
    }
  });

  it("aceita dígitos de 2 a 9, que fazem parte do alfabeto", () => {
    for (const digito of ["2", "3", "4", "5", "6", "7", "8", "9"]) {
      const codigo = `PACA-ABC${digito}`;
      assert.equal(isValidInviteCode(codigo), true, codigo);
    }
  });
});

describe("normalizeInviteCode", () => {
  it("coloca em maiúsculas o que o parceiro digitou em minúsculas", () => {
    assert.equal(normalizeInviteCode("paca-abcd"), "PACA-ABCD");
  });

  it("remove espaços colados por copiar e colar", () => {
    assert.equal(normalizeInviteCode("  PACA-ABCD  "), "PACA-ABCD");
    assert.equal(normalizeInviteCode("\n paca-a2b3c4d5e6 \t"), "PACA-A2B3C4D5E6");
  });

  it("não remove espaço no meio (isso continua sendo código inválido)", () => {
    assert.equal(normalizeInviteCode("paca-ab cd"), "PACA-AB CD");
    assert.equal(isValidInviteCode(normalizeInviteCode("paca-ab cd")), false);
  });

  it("é idempotente: normalizar duas vezes dá o mesmo resultado", () => {
    for (const entrada of ["  paca-abcd ", "PACA-A2B3C4D5E6", "lixo"]) {
      const uma = normalizeInviteCode(entrada);
      assert.equal(normalizeInviteCode(uma), uma);
    }
  });

  it("normalizar e validar aceita as duas gerações de código digitadas de qualquer jeito", () => {
    const digitados = [
      " paca-abcd ",
      "PACA-ABCD",
      "Paca-A2b3C4d5E6",
      "  paca-a2b3c4d5e6",
    ];
    for (const entrada of digitados) {
      assert.equal(isValidInviteCode(normalizeInviteCode(entrada)), true, entrada);
    }
  });
});
