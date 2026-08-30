// Shared i18n for Supabase Edge Functions.
//
// Edge functions run on Deno and cannot import the app's `@paca/shared` i18n
// (a workspace package resolved by the bundler), so this module is the
// Supabase-side home for any user-facing copy a function emits. Add new
// message groups and locales here rather than hardcoding strings inside a
// function. English is the fallback (see `resolveLang`) — it must match the
// app-wide default (DEFAULT_LOCALE = 'en' in packages/shared/src/i18n and the
// profiles.language column default).

export type Lang = "pt" | "en" | "ru" | "uk";

/**
 * Maps a raw `profiles.language` value to a supported {@link Lang}. Anything
 * that isn't an explicitly supported locale — empty, null, undefined, or
 * garbage — falls back to English, the app-wide default locale.
 */
export function resolveLang(language?: string | null): Lang {
  const code = (language ?? "").slice(0, 2).toLowerCase();
  if (code === "pt" || code === "ru" || code === "uk") return code;
  return "en";
}

export type BudgetAlertKey =
  | "nearPersonal"
  | "exceededPersonal"
  | "nearCouple"
  | "exceededCouple";

interface BudgetAlertCopy {
  title: string;
  body: (pct: number) => string;
}

const BUDGET_ALERTS: Record<Lang, Record<BudgetAlertKey, BudgetAlertCopy>> = {
  pt: {
    nearPersonal: {
      title: "Seu orçamento pessoal quase no limite!",
      body: (pct) => `Você já gastou ${pct}% do seu orçamento pessoal este mês.`,
    },
    exceededPersonal: {
      title: "Orçamento pessoal estourado!",
      body: (pct) => `Seu orçamento pessoal foi ultrapassado (${pct}%).`,
    },
    nearCouple: {
      title: "Orçamento quase no limite!",
      body: (pct) => `Vocês já gastaram ${pct}% do orçamento do mês.`,
    },
    exceededCouple: {
      title: "Orçamento estourado!",
      body: (pct) => `O orçamento do mês foi ultrapassado (${pct}%).`,
    },
  },
  en: {
    nearPersonal: {
      title: "Your personal budget is almost maxed out!",
      body: (pct) => `You've already spent ${pct}% of your personal budget this month.`,
    },
    exceededPersonal: {
      title: "Personal budget exceeded!",
      body: (pct) => `Your personal budget has been exceeded (${pct}%).`,
    },
    nearCouple: {
      title: "Budget almost maxed out!",
      body: (pct) => `You've already spent ${pct}% of this month's budget.`,
    },
    exceededCouple: {
      title: "Budget exceeded!",
      body: (pct) => `This month's budget has been exceeded (${pct}%).`,
    },
  },
  ru: {
    nearPersonal: {
      title: "Ваш личный бюджет почти исчерпан!",
      body: (pct) => `Вы уже потратили ${pct}% личного бюджета в этом месяце.`,
    },
    exceededPersonal: {
      title: "Личный бюджет превышен!",
      body: (pct) => `Ваш личный бюджет превышен (${pct}%).`,
    },
    nearCouple: {
      title: "Бюджет почти исчерпан!",
      body: (pct) => `Вы уже потратили ${pct}% бюджета этого месяца.`,
    },
    exceededCouple: {
      title: "Бюджет превышен!",
      body: (pct) => `Бюджет этого месяца превышен (${pct}%).`,
    },
  },
  uk: {
    nearPersonal: {
      title: "Ваш особистий бюджет майже вичерпано!",
      body: (pct) => `Ви вже витратили ${pct}% особистого бюджету цього місяця.`,
    },
    exceededPersonal: {
      title: "Особистий бюджет перевищено!",
      body: (pct) => `Ваш особистий бюджет перевищено (${pct}%).`,
    },
    nearCouple: {
      title: "Бюджет майже вичерпано!",
      body: (pct) => `Ви вже витратили ${pct}% бюджету цього місяця.`,
    },
    exceededCouple: {
      title: "Бюджет перевищено!",
      body: (pct) => `Бюджет цього місяця перевищено (${pct}%).`,
    },
  },
};

/**
 * Renders a localized budget-alert notification (title + body) for the given
 * language and alert variant. `pct` is the budget-usage percentage.
 */
export function budgetAlert(
  lang: Lang,
  key: BudgetAlertKey,
  pct: number
): { title: string; body: string } {
  const copy = BUDGET_ALERTS[lang][key];
  return { title: copy.title, body: copy.body(pct) };
}

/**
 * All localized titles for one budget-alert variant, across every supported
 * language. Titles are static per (lang, key), so check-budgets uses this set
 * as a dedup key: if the recipient already has a notification this month with
 * any of these titles, the same threshold alert was already sent (robust to
 * the user switching language mid-month).
 */
export function budgetAlertTitles(key: BudgetAlertKey): string[] {
  return Object.values(BUDGET_ALERTS).map((copy) => copy[key].title);
}

export type AdviceVerdict = "go" | "wait" | "avoid";

const ADVISOR_FALLBACK: Record<Lang, Record<AdviceVerdict, string>> = {
  pt: {
    go: "Os números batem: cabe no mês sem apertar as contas.",
    wait: "Não é proibido, mas esse mês ia ficar apertado. Vale esperar um pouco.",
    avoid: "Esse mês não dá, não. O saldo ou o orçamento não cobrem essa compra.",
  },
  en: {
    go: "The numbers check out: it fits this month without squeezing the bills.",
    wait: "It's not off the table, but this month would get tight. Worth waiting a bit.",
    avoid: "Not this month. The balance or the budget just doesn't cover this purchase.",
  },
  ru: {
    go: "Цифры сходятся: покупка вписывается в этот месяц без ущерба для счетов.",
    wait: "Не запрещено, но в этом месяце будет впритык. Стоит немного подождать.",
    avoid: "В этом месяце не получится: баланс или бюджет не покрывают эту покупку.",
  },
  uk: {
    go: "Цифри сходяться: покупка вписується в цей місяць без шкоди для рахунків.",
    wait: "Не заборонено, але цього місяця буде впритул. Варто трохи зачекати.",
    avoid: "Цього місяця не вийде: баланс або бюджет не покривають цю покупку.",
  },
};

/**
 * Localized last-resort advisor reasoning, used when the AI call fails or
 * returns empty text so the user always sees an explanation in their language.
 */
export function advisorFallback(lang: Lang, verdict: AdviceVerdict): string {
  return ADVISOR_FALLBACK[lang][verdict];
}
