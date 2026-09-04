/**
 * As funções de EXIBIÇÃO de data (`formatDate`, `formatMonthYear` e suas
 * versões localizadas) montam a data com `new Date(dateStr + "T00:00:00")` —
 * meia-noite LOCAL. Trocar isso por `new Date(dateStr)` (meia-noite UTC) é o
 * bug clássico "o dia 01 vira o dia 31 do mês anterior".
 *
 * O detalhe que torna este arquivo necessário: esse bug é INVISÍVEL em qualquer
 * fuso a leste de Greenwich. Numa máquina em UTC+2, `new Date("2026-03-01")`
 * ainda cai no dia 1º local, e o teste passa mesmo com o código quebrado. Só a
 * oeste (UTC-3, onde está a maior parte dos casais do app) o valor escorrega.
 * `format.test.ts` roda no fuso da máquina do dev e por isso NÃO cobre isso.
 *
 * Como esse caminho passa por `Intl` — que congela o fuso padrão no primeiro
 * uso e ignora mudanças posteriores em `process.env.TZ` —, o fuso é definido
 * ANTES do primeiro import via `import()` dinâmico. O runner do Node roda cada
 * arquivo em um processo separado, então isto não contamina os outros testes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "America/Sao_Paulo";

const { formatDate, formatMonthYear } = await import("../src/utils/date");
const { formatDateLocalized, formatMonthYearLocalized } = await import("../src/i18n/index");

// Garante que o fuso realmente pegou — sem isto, um dia este arquivo poderia
// passar a rodar em UTC e voltar a ser um teste que não prova nada.
describe("pré-condição do arquivo", () => {
  it("está mesmo rodando em UTC-3 (senão nada aqui prova coisa alguma)", () => {
    assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, "America/Sao_Paulo");
    assert.equal(new Date("2026-06-15T12:00:00Z").getTimezoneOffset(), 180);
    // A pegadinha em pessoa: meia-noite UTC do dia 1º é o dia 28 no Brasil.
    assert.equal(new Date("2026-03-01").getDate(), 28);
  });
});

/** Congela o "agora" trocando `globalThis.Date` por uma subclasse. */
function comInstante(instanteISO: string, fn: () => void): void {
  const DateReal = globalThis.Date;
  class DateCongelada extends DateReal {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      if (args.length === 0) super(instanteISO);
      else super(...args);
    }
    static now(): number {
      return new DateReal(instanteISO).getTime();
    }
  }
  globalThis.Date = DateCongelada as unknown as DateConstructor;
  try {
    fn();
  } finally {
    globalThis.Date = DateReal;
  }
}

/** Só os dígitos do dia que o formatador escreveu. */
function diaRenderizado(saida: string): number {
  const m = saida.match(/\d+/);
  assert.ok(m, `nenhum número em "${saida}"`);
  return Number(m![0]);
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

describe("formatMonthYear em UTC-3 — o dia 01 não pode escorregar para o mês anterior", () => {
  it("2026-03-01 é março, nunca fevereiro", () => {
    const saida = formatMonthYear("2026-03-01").toLowerCase();
    assert.match(saida, /março/, saida);
    assert.doesNotMatch(saida, /fevereiro/, saida);
  });

  it("todo mês de 2026 rende o próprio nome, não o do mês anterior", () => {
    for (let m = 0; m < 12; m++) {
      const chave = `2026-${String(m + 1).padStart(2, "0")}-01`;
      const saida = formatMonthYear(chave).toLowerCase();
      assert.match(saida, new RegExp(MESES_PT[m]), `${chave} rendeu "${saida}"`);
    }
  });

  it("janeiro não volta para dezembro do ano anterior", () => {
    const saida = formatMonthYear("2026-01-01").toLowerCase();
    assert.match(saida, /janeiro/);
    assert.match(saida, /2026/);
    assert.doesNotMatch(saida, /2025/, saida);
  });
});

describe("formatMonthYearLocalized em UTC-3 — mesmo risco, versão por idioma", () => {
  it("2026-03-01 é março em pt e March em en, nunca o mês anterior", () => {
    assert.match(formatMonthYearLocalized("2026-03-01", "pt").toLowerCase(), /março/);
    const en = formatMonthYearLocalized("2026-03-01", "en");
    assert.match(en, /March/);
    assert.doesNotMatch(en, /February/, en);
  });

  it("janeiro em nenhum idioma vira dezembro do ano anterior", () => {
    for (const locale of ["en", "pt", "ru", "uk"] as const) {
      const saida = formatMonthYearLocalized("2026-01-01", locale);
      assert.match(saida, /2026/, `${locale}: ${saida}`);
      assert.doesNotMatch(saida, /2025/, `${locale}: ${saida}`);
    }
  });
});

describe("formatDate em UTC-3 — o lançamento não pode aparecer um dia antes", () => {
  it("a data de hoje mostra 'Hoje'", () => {
    // 2026-06-15 14:00 em São Paulo.
    comInstante("2026-06-15T17:00:00Z", () => {
      assert.equal(formatDate("2026-06-15"), "Hoje");
    });
  });

  it("a véspera mostra 'Ontem'", () => {
    comInstante("2026-06-15T17:00:00Z", () => {
      assert.equal(formatDate("2026-06-14"), "Ontem");
    });
  });

  it("o primeiro dia do mês mostra 'Hoje', e não a data do último dia do mês anterior", () => {
    // 2026-03-01 09:00 em São Paulo — o instante em que o bug de UTC aparece.
    comInstante("2026-03-01T12:00:00Z", () => {
      assert.equal(formatDate("2026-03-01"), "Hoje");
    });
  });

  it("uma data antiga rende o próprio dia, não o dia anterior", () => {
    comInstante("2026-06-15T17:00:00Z", () => {
      assert.equal(diaRenderizado(formatDate("2026-06-13")), 13);
      assert.equal(diaRenderizado(formatDate("2026-03-01")), 1);
      assert.equal(diaRenderizado(formatDate("2026-01-01")), 1);
    });
  });
});

describe("formatDateLocalized em UTC-3 — mesmo risco, versão por idioma", () => {
  it("hoje e ontem batem em todos os idiomas", () => {
    comInstante("2026-06-15T17:00:00Z", () => {
      for (const locale of ["en", "pt", "ru", "uk"] as const) {
        const hoje = formatDateLocalized("2026-06-15", locale);
        const ontem = formatDateLocalized("2026-06-14", locale);
        assert.notEqual(hoje, ontem, locale);
        // O ramo relativo não passa por Intl: se a data escorregar, "hoje"
        // deixa de ser a palavra e vira uma data absoluta com dígito.
        assert.doesNotMatch(hoje, /\d/, `${locale} rendeu data absoluta para hoje: ${hoje}`);
        assert.doesNotMatch(ontem, /\d/, `${locale} rendeu data absoluta para ontem: ${ontem}`);
      }
    });
  });

  it("uma data antiga rende o próprio dia em todos os idiomas", () => {
    comInstante("2026-06-15T17:00:00Z", () => {
      for (const locale of ["en", "pt", "ru", "uk"] as const) {
        assert.equal(diaRenderizado(formatDateLocalized("2026-03-01", locale)), 1, locale);
        assert.equal(diaRenderizado(formatDateLocalized("2026-06-13", locale)), 13, locale);
      }
    });
  });
});
