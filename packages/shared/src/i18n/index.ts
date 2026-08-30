import { en, type TranslationKeys } from "./en";
import { pt } from "./pt";
import { ru } from "./ru";
import { uk } from "./uk";

export type Locale = "en" | "pt" | "ru" | "uk";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  ru: "Русский",
  uk: "Українська",
};

export const LOCALE_DATE_MAP: Record<Locale, string> = {
  en: "en-US",
  pt: "pt-BR",
  ru: "ru-RU",
  uk: "uk-UA",
};

const translations: Record<Locale, TranslationKeys> = { en, pt, ru, uk };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] ?? translations[DEFAULT_LOCALE];
}

export function getGreetingLocalized(locale: Locale): string {
  const t = getTranslations(locale);
  const hour = new Date().getHours();
  if (hour < 12) return t.dashboard.greeting.morning;
  if (hour < 18) return t.dashboard.greeting.afternoon;
  return t.dashboard.greeting.evening;
}

export function formatDateLocalized(dateStr: string, locale: Locale): string {
  const t = getTranslations(locale);
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return t.common.today;
  if (dateOnly.getTime() === yesterday.getTime()) return t.common.yesterday;

  return date.toLocaleDateString(LOCALE_DATE_MAP[locale], {
    day: "numeric",
    month: "short",
  });
}

export function formatMonthYearLocalized(dateStr: string, locale: Locale): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(LOCALE_DATE_MAP[locale], {
    month: "long",
    year: "numeric",
  });
}

// RU/UK need three plural forms (one/few/many) — a binary n === 1 check
// produces wrong grammar for counts ending in 2-4.
const pluralRulesCache = new Map<Locale, Intl.PluralRules>();

export function selectPluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALE_DATE_MAP[locale]);
    pluralRulesCache.set(locale, rules);
  }
  return rules.select(count);
}

/** Locale-correct "transaction(s)" word for scan counts (one/few/many). */
export function scanTransactionWord(
  slice: { transaction: string; transactionFew: string; transactions: string },
  locale: Locale,
  count: number
): string {
  const cat = selectPluralCategory(locale, count);
  if (cat === "one") return slice.transaction;
  if (cat === "few") return slice.transactionFew;
  return slice.transactions;
}

export type { TranslationKeys };
