import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  scanTransactionWord,
  selectPluralCategory,
  getTranslations,
  DEFAULT_LOCALE,
  LOCALE_DATE_MAP,
  type Locale,
} from "../src/i18n/index";
import { getCurrencyOption, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "../src/constants/currencies";

const LOCALES: Locale[] = ["en", "pt", "ru", "uk"];

function slice(locale: Locale) {
  return getTranslations(locale).scan;
}

// ---------------------------------------------------------------------------
// Plural de scan — russo e ucraniano têm TRÊS formas (one/few/many).
// ---------------------------------------------------------------------------

describe("scanTransactionWord — russo (три формы)", () => {
  const ru = slice("ru");

  it("1 usa a forma singular 'транзакция'", () => {
    assert.equal(scanTransactionWord(ru, "ru", 1), "транзакция");
  });

  it("2, 3 e 4 usam a forma 'few' — 'транзакции', não o singular nem o plural genérico", () => {
    for (const n of [2, 3, 4]) {
      assert.equal(scanTransactionWord(ru, "ru", n), "транзакции", `count=${n}`);
    }
  });

  it("5 a 20 usam a forma 'many' — 'транзакций'", () => {
    for (const n of [5, 6, 10, 11, 14, 20]) {
      assert.equal(scanTransactionWord(ru, "ru", n), "транзакций", `count=${n}`);
    }
  });

  it("21 volta ao singular (regra eslava: termina em 1, mas não em 11)", () => {
    assert.equal(scanTransactionWord(ru, "ru", 21), "транзакция");
    assert.equal(scanTransactionWord(ru, "ru", 101), "транзакция");
  });

  it("11 NÃO volta ao singular apesar de terminar em 1", () => {
    assert.equal(scanTransactionWord(ru, "ru", 11), "транзакций");
  });

  it("22 a 24 voltam à forma 'few'", () => {
    for (const n of [22, 23, 24]) {
      assert.equal(scanTransactionWord(ru, "ru", n), "транзакции", `count=${n}`);
    }
  });

  it("12 a 14 NÃO usam 'few' apesar de terminarem em 2-4", () => {
    for (const n of [12, 13, 14]) {
      assert.equal(scanTransactionWord(ru, "ru", n), "транзакций", `count=${n}`);
    }
  });

  it("zero usa a forma 'many'", () => {
    assert.equal(scanTransactionWord(ru, "ru", 0), "транзакций");
  });

  it("as três formas do russo são realmente distintas entre si", () => {
    const formas = new Set([ru.transaction, ru.transactionFew, ru.transactions]);
    assert.equal(formas.size, 3, "o russo precisa de três palavras diferentes");
  });
});

describe("scanTransactionWord — ucraniano (три форми)", () => {
  const uk = slice("uk");

  it("1 usa 'транзакція'", () => {
    assert.equal(scanTransactionWord(uk, "uk", 1), "транзакція");
  });

  it("2 a 4 usam 'транзакції'", () => {
    for (const n of [2, 3, 4, 22, 33]) {
      assert.equal(scanTransactionWord(uk, "uk", n), "транзакції", `count=${n}`);
    }
  });

  it("5 e 11 usam 'транзакцій'", () => {
    for (const n of [0, 5, 11, 15, 100]) {
      assert.equal(scanTransactionWord(uk, "uk", n), "транзакцій", `count=${n}`);
    }
  });

  it("as três formas do ucraniano são distintas entre si", () => {
    const formas = new Set([uk.transaction, uk.transactionFew, uk.transactions]);
    assert.equal(formas.size, 3);
  });
});

describe("scanTransactionWord — inglês e português (duas formas)", () => {
  it("inglês usa singular só no 1", () => {
    const en = slice("en");
    assert.equal(scanTransactionWord(en, "en", 1), "transaction");
    assert.equal(scanTransactionWord(en, "en", 0), "transactions");
    assert.equal(scanTransactionWord(en, "en", 2), "transactions");
    assert.equal(scanTransactionWord(en, "en", 21), "transactions");
  });

  it("português usa plural de 2 em diante (2 não pode virar 'few' à moda eslava)", () => {
    const pt = slice("pt");
    assert.equal(scanTransactionWord(pt, "pt", 1), "transação");
    assert.equal(scanTransactionWord(pt, "pt", 2), "transações");
    assert.equal(scanTransactionWord(pt, "pt", 100), "transações");
  });

  it("português trata zero como singular — regra do CLDR para pt (i = 0..1), não um acidente", () => {
    // Renderiza "0 transação". Se o produto quiser "0 transações", a correção
    // é um caso especial para count === 0, não mexer no Intl.PluralRules.
    assert.equal(selectPluralCategory("pt", 0), "one");
    assert.equal(scanTransactionWord(slice("pt"), "pt", 0), "transação");
  });

  it("nenhum locale devolve string vazia para nenhuma contagem de 0 a 30", () => {
    for (const locale of LOCALES) {
      const s = slice(locale);
      for (let n = 0; n <= 30; n++) {
        const palavra = scanTransactionWord(s, locale, n);
        assert.ok(palavra.length > 0, `${locale}/${n}`);
      }
    }
  });
});

describe("selectPluralCategory", () => {
  it("classifica as contagens do russo em one/few/many", () => {
    assert.equal(selectPluralCategory("ru", 1), "one");
    assert.equal(selectPluralCategory("ru", 3), "few");
    assert.equal(selectPluralCategory("ru", 7), "many");
  });

  it("classifica inglês e português em one/other", () => {
    assert.equal(selectPluralCategory("en", 1), "one");
    assert.equal(selectPluralCategory("en", 3), "other");
    assert.equal(selectPluralCategory("pt", 1), "one");
    assert.equal(selectPluralCategory("pt", 3), "other");
  });

  it("a segunda chamada devolve a MESMA categoria correta (o cache não corrompe a regra)", () => {
    // Comparar a função com ela mesma seria tautológico — nenhuma quebra
    // plausível do cache faria `f(x) !== f(x)`. O que pode quebrar é o cache
    // devolver a regra de OUTRO locale, então as categorias esperadas ficam
    // fixadas e cada locale é consultado duas vezes, com os outros no meio.
    const esperado: Array<[Locale, number, Intl.LDMLPluralRule]> = [
      ["ru", 1, "one"], ["ru", 2, "few"], ["ru", 5, "many"], ["ru", 11, "many"], ["ru", 21, "one"],
      ["uk", 1, "one"], ["uk", 2, "few"], ["uk", 5, "many"], ["uk", 11, "many"], ["uk", 21, "one"],
      ["en", 1, "one"], ["en", 2, "other"], ["en", 5, "other"], ["en", 11, "other"], ["en", 21, "other"],
      ["pt", 1, "one"], ["pt", 2, "other"], ["pt", 5, "other"], ["pt", 11, "other"], ["pt", 21, "other"],
    ];
    for (const [locale, n, cat] of esperado) {
      assert.equal(selectPluralCategory(locale, n), cat, `1ª volta ${locale}/${n}`);
    }
    for (const [locale, n, cat] of esperado) {
      assert.equal(selectPluralCategory(locale, n), cat, `2ª volta ${locale}/${n}`);
    }
  });

  it("não vaza a regra de um locale para outro pelo cache", () => {
    selectPluralCategory("ru", 2); // popula o cache do russo primeiro
    assert.equal(selectPluralCategory("en", 2), "other");
    assert.equal(selectPluralCategory("ru", 2), "few");
  });
});

describe("getTranslations", () => {
  it("devolve o dicionário do locale pedido", () => {
    assert.equal(getTranslations("pt").scan.transaction, "transação");
    assert.equal(getTranslations("en").scan.transaction, "transaction");
  });

  it("cai no locale padrão quando recebe um locale desconhecido", () => {
    const desconhecido = getTranslations("de" as Locale);
    assert.equal(desconhecido.scan.transaction, getTranslations(DEFAULT_LOCALE).scan.transaction);
  });

  it("todo locale tem as três chaves de plural de scan preenchidas", () => {
    for (const locale of LOCALES) {
      const s = slice(locale);
      for (const chave of ["transaction", "transactionFew", "transactions"] as const) {
        assert.equal(typeof s[chave], "string", `${locale}.${chave}`);
        assert.ok(s[chave].length > 0, `${locale}.${chave} está vazia`);
      }
    }
  });

  it("todo locale tem um mapa de data válido para Intl", () => {
    for (const locale of LOCALES) {
      const tag = LOCALE_DATE_MAP[locale];
      assert.ok(tag, locale);
      assert.doesNotThrow(() => new Intl.DateTimeFormat(tag));
    }
  });
});

// ---------------------------------------------------------------------------
// Moeda por locale
// ---------------------------------------------------------------------------

describe("getCurrencyOption — moeda do casal", () => {
  it("encontra a moeda pelo código ISO", () => {
    assert.equal(getCurrencyOption("UAH").symbol, "₴");
    assert.equal(getCurrencyOption("RUB").symbol, "₽");
    assert.equal(getCurrencyOption("BRL").symbol, "R$");
  });

  it("aceita o código em minúsculas", () => {
    assert.deepEqual(getCurrencyOption("eur"), getCurrencyOption("EUR"));
  });

  it("cai na moeda padrão quando o casal ainda não escolheu (null/undefined/vazio)", () => {
    for (const entrada of [null, undefined, ""]) {
      assert.equal(getCurrencyOption(entrada).code, DEFAULT_CURRENCY);
    }
  });

  it("devolve um fallback usável para moeda não suportada em vez de quebrar", () => {
    const opcao = getCurrencyOption("nok");
    assert.deepEqual(opcao, { code: "NOK", symbol: "NOK", name: "NOK" });
  });

  it("toda moeda suportada é formatável pelo Intl (senão o app quebra na tela)", () => {
    for (const { code } of SUPPORTED_CURRENCIES) {
      assert.doesNotThrow(
        () => new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(1),
        code
      );
    }
  });

  it("não há código de moeda duplicado na lista", () => {
    const codigos = SUPPORTED_CURRENCIES.map((c) => c.code);
    assert.equal(new Set(codigos).size, codigos.length);
  });

  it("a moeda padrão está na lista de suportadas", () => {
    assert.ok(SUPPORTED_CURRENCIES.some((c) => c.code === DEFAULT_CURRENCY));
  });
});
