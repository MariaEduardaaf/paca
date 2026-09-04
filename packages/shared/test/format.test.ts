import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatDate, formatMonthYear, getGreeting } from "../src/utils/date";
import { formatDateLocalized, formatMonthYearLocalized, getGreetingLocalized } from "../src/i18n/index";

/**
 * Este arquivo NÃO mexe em `process.env.TZ`: tudo aqui passa por `Intl`, que
 * cacheia o fuso padrão no primeiro uso e ignora mudanças posteriores. Os
 * testes sensíveis a fuso vivem em `date.test.ts`, que roda em outro processo.
 *
 * O "agora" é congelado trocando `globalThis.Date` por uma subclasse que
 * devolve um instante fixo quando construída sem argumentos.
 */
function comInstante(instanteISO: string, fn: () => void): void {
  const DateReal = globalThis.Date;
  class DateCongelada extends DateReal {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      if (args.length === 0) {
        super(instanteISO);
      } else {
        super(...args);
      }
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

/** Instante local (não UTC) — evita depender do fuso da máquina que roda o teste. */
function instanteLocal(ano: number, mes: number, dia: number, hora: number): string {
  return new Date(ano, mes - 1, dia, hora, 0, 0).toISOString();
}

describe("formatDate — datas relativas", () => {
  it("mostra 'Hoje' para a data de hoje", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      assert.equal(formatDate("2026-06-15"), "Hoje");
    });
  });

  it("mostra 'Ontem' para a véspera", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      assert.equal(formatDate("2026-06-14"), "Ontem");
    });
  });

  it("mostra 'Ontem' mesmo quando a véspera é do mês anterior", () => {
    comInstante(instanteLocal(2026, 7, 1, 9), () => {
      assert.equal(formatDate("2026-06-30"), "Ontem");
    });
  });

  it("mostra 'Hoje' às 23h59, e não 'Ontem' (o lançamento da noite é de hoje)", () => {
    comInstante(instanteLocal(2026, 6, 15, 23), () => {
      assert.equal(formatDate("2026-06-15"), "Hoje");
    });
  });

  it("mostra 'Hoje' às 00h05, e não a data absoluta", () => {
    comInstante(instanteLocal(2026, 6, 15, 0), () => {
      assert.equal(formatDate("2026-06-15"), "Hoje");
    });
  });

  it("mostra a data absoluta (dia + mês) para anteontem, sem cair em 'Hoje'/'Ontem'", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      const saida = formatDate("2026-06-13");
      assert.notEqual(saida, "Hoje");
      assert.notEqual(saida, "Ontem");
      assert.match(saida, /13/);
    });
  });

  it("não confunde uma data futura com 'Hoje'", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      assert.notEqual(formatDate("2026-06-16"), "Hoje");
    });
  });
});

describe("formatMonthYear", () => {
  it("rende mês e ano da data recebida sem escorregar de mês", () => {
    const saida = formatMonthYear("2026-03-01");
    assert.match(saida, /2026/);
    assert.match(saida.toLowerCase(), /mar/);
  });

  it("o dia 01 não escorrega para o mês anterior (bug de interpretar a data como UTC)", () => {
    for (const mes of ["2026-01-01", "2026-06-01", "2026-12-01"]) {
      const saida = formatMonthYear(mes);
      assert.match(saida, /202[67]/, mes);
    }
    assert.match(formatMonthYear("2026-01-01").toLowerCase(), /jan/);
    assert.match(formatMonthYear("2026-12-01").toLowerCase(), /dez/);
  });
});

describe("formatDateLocalized — versão por locale", () => {
  it("usa a palavra 'Hoje' do idioma escolhido", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      assert.equal(formatDateLocalized("2026-06-15", "pt"), "Hoje");
      assert.equal(formatDateLocalized("2026-06-15", "en"), "Today");
      assert.notEqual(formatDateLocalized("2026-06-15", "ru"), "Today");
      assert.notEqual(formatDateLocalized("2026-06-15", "uk"), "Today");
    });
  });

  it("usa a palavra 'Ontem' do idioma escolhido", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      assert.equal(formatDateLocalized("2026-06-14", "pt"), "Ontem");
      assert.equal(formatDateLocalized("2026-06-14", "en"), "Yesterday");
    });
  });

  it("formata datas antigas de forma diferente em cada locale", () => {
    comInstante(instanteLocal(2026, 6, 15, 14), () => {
      const saidas = (["en", "pt", "ru", "uk"] as const).map((l) =>
        formatDateLocalized("2026-03-09", l)
      );
      for (const saida of saidas) {
        assert.ok(saida.length > 0);
        assert.match(saida, /9/);
      }
      assert.notEqual(saidas[0], saidas[2], "en e ru renderizaram igual");
    });
  });
});

describe("formatMonthYearLocalized", () => {
  it("rende o mês no idioma pedido", () => {
    assert.match(formatMonthYearLocalized("2026-03-01", "pt").toLowerCase(), /mar/);
    assert.match(formatMonthYearLocalized("2026-03-01", "en").toLowerCase(), /mar/);
    assert.match(formatMonthYearLocalized("2026-03-01", "ru"), /2026/);
    assert.notEqual(
      formatMonthYearLocalized("2026-03-01", "en"),
      formatMonthYearLocalized("2026-03-01", "ru")
    );
  });
});

describe("saudação por hora do dia", () => {
  const casos: Array<[number, "morning" | "afternoon" | "evening"]> = [
    [0, "morning"],
    [8, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [23, "evening"],
  ];

  it("getGreeting muda nas fronteiras de 12h e 18h", () => {
    const esperado = { morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite" };
    for (const [hora, periodo] of casos) {
      comInstante(instanteLocal(2026, 6, 15, hora), () => {
        assert.equal(getGreeting(), esperado[periodo], `hora=${hora}`);
      });
    }
  });

  it("getGreetingLocalized usa as mesmas fronteiras em cada idioma", () => {
    for (const locale of ["en", "pt", "ru", "uk"] as const) {
      const vistos = new Set<string>();
      for (const [hora] of casos) {
        comInstante(instanteLocal(2026, 6, 15, hora), () => {
          vistos.add(getGreetingLocalized(locale));
        });
      }
      assert.equal(vistos.size, 3, `${locale} não produziu três saudações distintas`);
    }
  });

  it("getGreetingLocalized em pt bate com getGreeting", () => {
    for (const [hora] of casos) {
      comInstante(instanteLocal(2026, 6, 15, hora), () => {
        assert.equal(getGreetingLocalized("pt"), getGreeting(), `hora=${hora}`);
      });
    }
  });
});
