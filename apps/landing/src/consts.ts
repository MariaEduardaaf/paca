export const SITE_TITLE = "Paca Finance";

export const SITE_DESCRIPTION =
  "App para casais organizarem o dinheiro juntos: cada gasto aparece para os dois na hora, foto do recibo vira transação e o orçamento do mês é o mesmo para as duas pessoas. Funciona no navegador, grátis para começar.";

// Um lugar só para mudar a URL pública da landing (o apex do produto).
// astro.config.mjs espelha esta lógica — ele roda antes do código da app.
export const SITE_URL: string =
  import.meta.env.SITE_URL || "https://pacafinance.com.br";

// O app web — o único produto utilizável hoje.
export const APP_URL = "https://app.pacafinance.com.br";

// Destino de TODA chamada para ação desta página. A raiz do app é rota
// protegida: quem não tem conta cai numa tela de senha, que é o pior lugar
// para entregar alguém vindo de um anúncio. /signup é público e abre direto
// no cadastro.
export const SIGNUP_URL = `${APP_URL}/signup`;
export const LOGIN_URL = `${APP_URL}/login`;

// Páginas legais e de suporte: existem DENTRO do app web
// (apps/web/src/App.tsx — rotas /privacy, /terms, /support). A landing não tem
// cópia própria delas de propósito: duas versões da mesma política é como uma
// delas fica desatualizada sem ninguém notar.
export const PRIVACY_URL = `${APP_URL}/privacy`;
export const TERMS_URL = `${APP_URL}/terms`;
export const SUPPORT_URL = `${APP_URL}/support`;

// Blog de conteúdo (projeto separado, apps/blog, outro domínio).
export const BLOG_URL = "https://blog.pacafinance.com.br";

/*
 * Idiomas REAIS do app — a lista vive em packages/shared/src/i18n/index.ts
 * (LOCALE_LABELS) e são exatamente estes quatro arquivos: en.ts, pt.ts, ru.ts,
 * uk.ts. Está duplicado aqui porque a landing é um projeto Astro estático que
 * não importa o pacote compartilhado; se um idioma entrar lá, entra aqui.
 */
export const APP_LOCALES = ["Português", "English", "Русский", "Українська"] as const;

/*
 * Quantidade de moedas suportadas — packages/shared/src/constants/currencies.ts
 * (SUPPORTED_CURRENCIES). Mesma observação de duplicação da lista acima.
 */
export const CURRENCY_COUNT = 13;
