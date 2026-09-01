import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseMoneyInput,
  centsToInput,
  parseCurrencyInput,
  centsToDecimal,
  decimalToCents,
  formatCurrency,
} from "../src/utils/currency";

// ---------------------------------------------------------------------------
// parseMoneyInput — a errada aqui corrompe dinheiro em 10x/100x.
// ---------------------------------------------------------------------------

describe("parseMoneyInput — convenção brasileira (vírgula decimal)", () => {
  it("interpreta '1.234,56' como 123456 centavos (ponto é milhar, vírgula é decimal)", () => {
    assert.equal(parseMoneyInput("1.234,56"), 123456);
  });

  it("interpreta '12,50' como 1250 centavos", () => {
    assert.equal(parseMoneyInput("12,50"), 1250);
  });

  it("completa a segunda casa quando o usuário digita só uma ('12,5' vira 1250, não 125)", () => {
    assert.equal(parseMoneyInput("12,5"), 1250);
  });

  it("interpreta '1.234.567,89' com múltiplos separadores de milhar", () => {
    assert.equal(parseMoneyInput("1.234.567,89"), 123456789);
  });

  it("aceita valor começando pela vírgula (',99' vira 99 centavos)", () => {
    assert.equal(parseMoneyInput(",99"), 99);
  });
});

describe("parseMoneyInput — convenção americana (ponto decimal)", () => {
  it("interpreta '12.50' como 1250 centavos, não 1250000", () => {
    assert.equal(parseMoneyInput("12.50"), 1250);
  });

  it("interpreta '1,234.56' como 123456 centavos (vírgula é milhar)", () => {
    assert.equal(parseMoneyInput("1,234.56"), 123456);
  });

  it("interpreta '3000.5' como 300050 centavos (uma casa decimal)", () => {
    assert.equal(parseMoneyInput("3000.5"), 300050);
  });

  it("aceita valor começando pelo ponto ('.50' vira 50 centavos)", () => {
    assert.equal(parseMoneyInput(".50"), 50);
  });
});

describe("parseMoneyInput — inteiros e separador de milhar sozinho", () => {
  it("interpreta '1234' como 123400 centavos (inteiro em reais, não em centavos)", () => {
    assert.equal(parseMoneyInput("1234"), 123400);
  });

  it("trata '1.234' como mil duzentos e trinta e quatro reais (123400), não 1 real e 23 centavos", () => {
    assert.equal(parseMoneyInput("1.234"), 123400);
  });

  it("trata '1,234' também como milhar (123400) — três dígitos após o separador nunca são decimais", () => {
    assert.equal(parseMoneyInput("1,234"), 123400);
  });

  it("trata '1,234,567' como 123456700 centavos", () => {
    assert.equal(parseMoneyInput("1,234,567"), 123456700);
  });
});

describe("parseMoneyInput — sujeira do usuário", () => {
  it("ignora símbolo de moeda e espaços em 'R$ 1.234,56'", () => {
    assert.equal(parseMoneyInput("R$ 1.234,56"), 123456);
  });

  it("ignora espaços em volta do valor", () => {
    assert.equal(parseMoneyInput("   12,50   "), 1250);
  });

  it("ignora espaço usado como separador de milhar ('1 234,56')", () => {
    assert.equal(parseMoneyInput("1 234,56"), 123456);
  });

  it("ignora letras coladas no número ('12,50 reais')", () => {
    assert.equal(parseMoneyInput("12,50 reais"), 1250);
  });

  it("aceita moeda com símbolo à direita ('1.234,56 €')", () => {
    assert.equal(parseMoneyInput("1.234,56 €"), 123456);
  });
});

describe("parseMoneyInput — entradas que devem virar null", () => {
  const casosNulos: Array<[string, string]> = [
    ["string vazia", ""],
    ["só espaços", "   "],
    ["só letras", "abc"],
    ["só o símbolo da moeda", "R$"],
    ["só separadores", ".,."],
    ["negativo simples", "-5"],
    ["negativo com decimais", "-12,50"],
    ["negativo com moeda", "-R$ 10,00"],
    ["negativo colado no símbolo", "-0,01"],
    ["zero", "0"],
    ["zero com decimais", "0,00"],
    ["zero com ponto decimal", "0.00"],
    ["zero com milhar falso", "0.000"],
  ];

  for (const [nome, entrada] of casosNulos) {
    it(`retorna null para ${nome} (${JSON.stringify(entrada)})`, () => {
      assert.equal(parseMoneyInput(entrada), null);
    });
  }

  it("retorna null para valor absurdo que estoura o inteiro seguro", () => {
    assert.equal(parseMoneyInput("99999999999999999999"), null);
  });

  it("retorna null para uma sequência gigante de noves com decimais", () => {
    assert.equal(parseMoneyInput("999999999999999999,99"), null);
  });

  it("aceita o valor logo abaixo do teto de inteiro seguro e devolve o número exato", () => {
    // 9007199254740,99 -> 900719925474099 centavos, ainda dentro de 2^53-1.
    // Fixar o número exato (em vez de só "é seguro") é o que faz este teste
    // falhar se a guarda de segurança for trocada por um clamp silencioso.
    assert.equal(parseMoneyInput("9007199254740,99"), 900719925474099);
  });
});

describe("parseMoneyInput — comportamento documentado em entradas ambíguas", () => {
  it("aceita o maior valor que ainda cabe em inteiro seguro", () => {
    // 90071992547409,00 -> 9007199254740900 centavos, dentro de 2^53-1.
    assert.equal(parseMoneyInput("90071992547409"), 9007199254740900);
  });

  it("trata notação científica como dígitos soltos: '1e999' vira 199900 centavos (nunca Infinity)", () => {
    const resultado = parseMoneyInput("1e999");
    assert.equal(resultado, 199900);
    assert.ok(Number.isFinite(resultado!));
  });

  it("descarta separador seguido de 3+ dígitos: '1,23456' vira 12345600 centavos", () => {
    assert.equal(parseMoneyInput("1,23456"), 12345600);
  });

  it("nunca devolve fração de centavo — cada entrada tem um inteiro exato esperado", () => {
    // `Number.isInteger` sozinho é tautológico aqui (parseInt sempre devolve
    // inteiro): o valor esperado é fixado para o teste poder falhar de verdade.
    const esperados: Array<[string, number]> = [
      ["12,50", 1250],
      ["3000.5", 300050],
      ["1.234,56", 123456],
      ["0,01", 1],
      ["7", 700],
      [".5", 50],
    ];
    for (const [entrada, esperado] of esperados) {
      const centavos = parseMoneyInput(entrada);
      assert.equal(centavos, esperado, entrada);
      assert.ok(Number.isInteger(centavos), `${entrada} -> ${centavos}`);
    }
  });

  it("é indiferente à ordem de grandeza: 1 real é sempre 100 centavos", () => {
    assert.equal(parseMoneyInput("1"), 100);
    assert.equal(parseMoneyInput("1,00"), 100);
    assert.equal(parseMoneyInput("1.00"), 100);
    assert.equal(parseMoneyInput("R$1,00"), 100);
  });
});

// ---------------------------------------------------------------------------
// centsToInput — prefill de edição. O bug do orçamento multiplicava por 10.
// ---------------------------------------------------------------------------

describe("centsToInput", () => {
  it("mostra 123456 centavos como '1234,56'", () => {
    assert.equal(centsToInput(123456), "1234,56");
  });

  it("omite os decimais quando o valor é redondo (123400 vira '1234')", () => {
    assert.equal(centsToInput(123400), "1234");
  });

  it("não usa separador de milhar (evita reparse ambíguo)", () => {
    assert.equal(centsToInput(123456789), "1234567,89");
    assert.ok(!centsToInput(123456789).includes("."));
  });

  it("mantém o zero à esquerda em valores abaixo de 1 real", () => {
    assert.equal(centsToInput(50), "0,50");
    assert.equal(centsToInput(5), "0,05");
  });

  it("preserva a casa dos centavos com zero à esquerda (1205 vira '12,05')", () => {
    assert.equal(centsToInput(1205), "12,05");
  });

  it("mostra zero como '0'", () => {
    assert.equal(centsToInput(0), "0");
  });

  it("preserva o sinal em valores negativos", () => {
    assert.equal(centsToInput(-1250), "-12,50");
    assert.equal(centsToInput(-100), "-1");
  });

  it("arredonda entrada fracionária em vez de truncar em texto quebrado", () => {
    assert.equal(centsToInput(1250.4), "12,50");
    assert.equal(centsToInput(1250.6), "12,51");
  });
});

// ---------------------------------------------------------------------------
// Ida e volta: editar um lançamento não pode inflar o valor.
// ---------------------------------------------------------------------------

describe("ciclo de edição: parseMoneyInput <-> centsToInput", () => {
  const valores = [
    1, 5, 50, 99, 100, 101, 999, 1000, 1250, 1205, 123400, 123456, 300050,
    999999, 1000000, 123456789,
  ];

  it("um ciclo de edição preserva o valor exato", () => {
    for (const centavos of valores) {
      const reparsed = parseMoneyInput(centsToInput(centavos));
      assert.equal(reparsed, centavos, `${centavos} virou ${reparsed}`);
    }
  });

  it("dez ciclos de edição seguidos não inflam nem encolhem o valor", () => {
    for (const centavos of valores) {
      let atual = centavos;
      for (let i = 0; i < 10; i++) {
        const texto = centsToInput(atual);
        const proximo = parseMoneyInput(texto);
        assert.notEqual(proximo, null, `${centavos} virou null na volta ${i} (texto ${texto})`);
        atual = proximo!;
      }
      assert.equal(atual, centavos, `${centavos} virou ${atual} depois de 10 ciclos`);
    }
  });

  it("valor de orçamento redondo (R$ 3.000) não vira R$ 30.000 ao reeditar", () => {
    const orcamento = 300000; // R$ 3.000,00
    const prefill = centsToInput(orcamento);
    assert.equal(prefill, "3000");
    assert.equal(parseMoneyInput(prefill), 300000);
  });

  it("o texto que o usuário digitou sobrevive ao salvar e reabrir", () => {
    for (const digitado of ["1.234,56", "12,50", "3000.5", "1234", "1,234.56"]) {
      const salvo = parseMoneyInput(digitado)!;
      const reaberto = parseMoneyInput(centsToInput(salvo));
      assert.equal(reaberto, salvo, `${digitado}: ${salvo} -> ${reaberto}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers auxiliares
// ---------------------------------------------------------------------------

describe("parseCurrencyInput (legado)", () => {
  it("delega para parseMoneyInput e acerta o separador de milhar", () => {
    assert.equal(parseCurrencyInput("1.234,56"), 123456);
  });

  it("devolve 0 em vez de null quando a entrada é inválida", () => {
    assert.equal(parseCurrencyInput("abc"), 0);
    assert.equal(parseCurrencyInput(""), 0);
    assert.equal(parseCurrencyInput("-10"), 0);
  });
});

describe("centsToDecimal / decimalToCents", () => {
  it("converte centavos para reais sem perder a casa decimal", () => {
    assert.equal(centsToDecimal(123456), 1234.56);
    assert.equal(centsToDecimal(5), 0.05);
  });

  it("converte reais para centavos arredondando o binário sujo (19.99 * 100)", () => {
    assert.equal(decimalToCents(19.99), 1999);
    assert.equal(decimalToCents(0.1 + 0.2), 30);
  });

  it("ida e volta preserva o valor em centavos", () => {
    for (const centavos of [1, 99, 1999, 123456, 999999999]) {
      assert.equal(decimalToCents(centsToDecimal(centavos)), centavos);
    }
  });
});

describe("formatCurrency (depreciada, fixa em pt-BR/BRL)", () => {
  const normalizar = (s: string) => s.replace(/ /g, " ");

  it("formata centavos como real brasileiro com milhar por ponto e decimal por vírgula", () => {
    assert.equal(normalizar(formatCurrency(123456)), "R$ 1.234,56");
  });

  it("sempre mostra as duas casas decimais", () => {
    assert.equal(normalizar(formatCurrency(100)), "R$ 1,00");
    assert.equal(normalizar(formatCurrency(0)), "R$ 0,00");
  });

  it("mantém o sinal negativo antes do símbolo", () => {
    assert.equal(normalizar(formatCurrency(-1250)), "-R$ 12,50");
  });

  // Removido: um `assert.ok(formatCurrency(1000).includes("R$"))` que só repetia,
  // de forma mais fraca, o que as igualdades exatas acima já fixam. Nenhuma
  // quebra plausível de `formatCurrency` passava por ele sem derrubar as outras.
});
