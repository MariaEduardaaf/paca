import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatLocalDate,
  getTodayLocal,
  getCurrentMonth,
  getMonthRange,
} from "../src/utils/date";

/**
 * Estratégia de determinismo (sem dependência nova):
 *
 * 1. Fuso: `process.env.TZ` é reatribuído dentro do teste e restaurado no
 *    `finally`. O Node reavalia o fuso do objeto `Date` na hora, então
 *    `getFullYear/getMonth/getDate` já respondem no fuso novo. Isto vale para
 *    os getters de `Date` — NÃO vale para `Intl`, que cacheia o fuso padrão no
 *    primeiro uso. Por isso este arquivo só toca funções baseadas em getters;
 *    tudo que passa por `toLocaleDateString` mora em `format.test.ts`, que
 *    nunca mexe em TZ. Como o runner do Node roda cada arquivo em um processo
 *    separado, um arquivo não contamina o outro.
 *
 * 2. "Agora": `globalThis.Date` é trocado por uma subclasse que, quando
 *    construída sem argumentos, devolve um instante fixo. Restaurada no
 *    `finally`. É o mínimo necessário para testar `getTodayLocal`, que não
 *    aceita injeção de data.
 */
function comFusoEInstante(tz: string, instanteISO: string, fn: () => void): void {
  const tzAnterior = process.env.TZ;
  const DateReal = globalThis.Date;
  process.env.TZ = tz;
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
    if (tzAnterior === undefined) delete process.env.TZ;
    else process.env.TZ = tzAnterior;
  }
}

function comFuso(tz: string, fn: () => void): void {
  const tzAnterior = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (tzAnterior === undefined) delete process.env.TZ;
    else process.env.TZ = tzAnterior;
  }
}

// ---------------------------------------------------------------------------

describe("formatLocalDate — usa o dia do calendário LOCAL, nunca o UTC", () => {
  it("em UTC-3, 01:30 UTC ainda é o dia (e o mês) anterior", () => {
    comFuso("America/Sao_Paulo", () => {
      // 2026-03-01T01:30Z = 2026-02-28 22:30 em São Paulo.
      assert.equal(formatLocalDate(new Date("2026-03-01T01:30:00Z")), "2026-02-28");
    });
  });

  it("o mesmo instante em UTC cai no dia seguinte — provando que a função é local", () => {
    comFuso("UTC", () => {
      assert.equal(formatLocalDate(new Date("2026-03-01T01:30:00Z")), "2026-03-01");
    });
  });

  it("em UTC+9, 23:30 UTC já é o dia seguinte", () => {
    comFuso("Asia/Tokyo", () => {
      // 2026-02-28T23:30Z = 2026-03-01 08:30 em Tóquio.
      assert.equal(formatLocalDate(new Date("2026-02-28T23:30:00Z")), "2026-03-01");
    });
  });

  it("em UTC+14 a virada de ano acontece antes do UTC", () => {
    comFuso("Pacific/Kiritimati", () => {
      assert.equal(formatLocalDate(new Date("2026-12-31T12:00:00Z")), "2027-01-01");
    });
  });

  it("zero-padda mês e dia de um dígito", () => {
    comFuso("UTC", () => {
      assert.equal(formatLocalDate(new Date("2026-01-05T12:00:00Z")), "2026-01-05");
    });
  });

  it("sempre devolve exatamente o formato YYYY-MM-DD", () => {
    comFuso("America/Sao_Paulo", () => {
      for (const iso of [
        "2026-01-01T03:00:00Z",
        "2026-06-15T18:45:00Z",
        "2024-02-29T12:00:00Z",
        "2026-12-31T23:59:59Z",
      ]) {
        assert.match(formatLocalDate(new Date(iso)), /^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  it("lida com o ano bissexto (29 de fevereiro existe)", () => {
    comFuso("UTC", () => {
      assert.equal(formatLocalDate(new Date("2024-02-29T10:00:00Z")), "2024-02-29");
    });
  });
});

describe("getTodayLocal — o lançamento da noite não pode cair no dia seguinte", () => {
  it("lançamento às 21h de 30/06 em UTC-3 registra 2026-06-30, não 2026-07-01", () => {
    // 2026-07-01T00:30Z = 2026-06-30 21:30 em São Paulo: vira dia E mês em UTC.
    comFusoEInstante("America/Sao_Paulo", "2026-07-01T00:30:00Z", () => {
      assert.equal(getTodayLocal(), "2026-06-30");
    });
  });

  it("o mesmo instante em UTC devolve 2026-07-01 — a diferença é o fuso, não a função", () => {
    comFusoEInstante("UTC", "2026-07-01T00:30:00Z", () => {
      assert.equal(getTodayLocal(), "2026-07-01");
    });
  });

  it("lançamento às 23h59 de 31/12 em UTC-3 fica em 2026, não em 2027", () => {
    comFusoEInstante("America/Sao_Paulo", "2027-01-01T02:59:00Z", () => {
      assert.equal(getTodayLocal(), "2026-12-31");
    });
  });

  it("em UTC+9 a madrugada já pertence ao dia seguinte ao do UTC", () => {
    comFusoEInstante("Asia/Tokyo", "2026-06-30T23:00:00Z", () => {
      assert.equal(getTodayLocal(), "2026-07-01");
    });
  });

  it("concorda com formatLocalDate(new Date()) em qualquer fuso", () => {
    for (const tz of ["America/Sao_Paulo", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"]) {
      comFusoEInstante(tz, "2026-03-01T01:30:00Z", () => {
        assert.equal(getTodayLocal(), formatLocalDate(new Date()));
      });
    }
  });
});

describe("getCurrentMonth — o primeiro dia do mês LOCAL", () => {
  it("às 21h de 30/06 em UTC-3 o mês corrente ainda é junho", () => {
    comFusoEInstante("America/Sao_Paulo", "2026-07-01T00:30:00Z", () => {
      assert.equal(getCurrentMonth(), "2026-06-01");
    });
  });

  it("no mesmo instante em UTC o mês corrente já é julho", () => {
    comFusoEInstante("UTC", "2026-07-01T00:30:00Z", () => {
      assert.equal(getCurrentMonth(), "2026-07-01");
    });
  });

  it("sempre aponta para o dia 01", () => {
    comFusoEInstante("America/Sao_Paulo", "2026-08-17T15:00:00Z", () => {
      assert.equal(getCurrentMonth(), "2026-08-01");
    });
  });
});

describe("getMonthRange — o mês inteiro, ancorado no calendário local", () => {
  it("março de 2026 vai de 01 a 31", () => {
    comFuso("America/Sao_Paulo", () => {
      assert.deepEqual(getMonthRange("2026-03-01"), {
        start: "2026-03-01",
        end: "2026-03-31",
      });
    });
  });

  it("não escorrega para fevereiro em UTC-3 (o bug de interpretar a data como UTC)", () => {
    comFuso("America/Sao_Paulo", () => {
      const { start } = getMonthRange("2026-03-01");
      assert.equal(start, "2026-03-01");
      assert.ok(!start.startsWith("2026-02"), "o mês começou em fevereiro");
    });
  });

  it("fevereiro de ano bissexto termina em 29", () => {
    comFuso("America/Sao_Paulo", () => {
      assert.deepEqual(getMonthRange("2024-02-01"), {
        start: "2024-02-01",
        end: "2024-02-29",
      });
    });
  });

  it("fevereiro de ano comum termina em 28", () => {
    comFuso("America/Sao_Paulo", () => {
      assert.equal(getMonthRange("2026-02-01").end, "2026-02-28");
    });
  });

  it("dezembro termina em 31 e não vaza para janeiro do ano seguinte", () => {
    comFuso("America/Sao_Paulo", () => {
      assert.deepEqual(getMonthRange("2026-12-01"), {
        start: "2026-12-01",
        end: "2026-12-31",
      });
    });
  });

  it("janeiro começa em 01 e não volta para dezembro do ano anterior", () => {
    comFuso("Asia/Tokyo", () => {
      assert.deepEqual(getMonthRange("2026-01-01"), {
        start: "2026-01-01",
        end: "2026-01-31",
      });
    });
  });

  it("meses de 30 dias terminam em 30", () => {
    comFuso("UTC", () => {
      for (const mes of ["2026-04-01", "2026-06-01", "2026-09-01", "2026-11-01"]) {
        assert.equal(getMonthRange(mes).end.slice(-2), "30", mes);
      }
    });
  });

  it("devolve o mesmo intervalo em qualquer fuso (UTC-3, UTC, UTC+9, UTC+14)", () => {
    const esperado = { start: "2026-03-01", end: "2026-03-31" };
    for (const tz of ["America/Sao_Paulo", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"]) {
      comFuso(tz, () => {
        assert.deepEqual(getMonthRange("2026-03-01"), esperado, tz);
      });
    }
  });

  it("ancora no mês da data recebida mesmo quando o dia não é o primeiro", () => {
    comFuso("America/Sao_Paulo", () => {
      assert.deepEqual(getMonthRange("2026-05-17"), {
        start: "2026-05-01",
        end: "2026-05-31",
      });
    });
  });

  it("start nunca é posterior a end", () => {
    comFuso("America/Sao_Paulo", () => {
      for (let m = 1; m <= 12; m++) {
        const mes = `2026-${String(m).padStart(2, "0")}-01`;
        const { start, end } = getMonthRange(mes);
        assert.ok(start <= end, `${mes}: ${start} > ${end}`);
        assert.equal(start.slice(0, 7), mes.slice(0, 7));
        assert.equal(end.slice(0, 7), mes.slice(0, 7));
      }
    });
  });
});
