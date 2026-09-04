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
/*
 * A privacidade desta página é a do BLOG, e não a do app — de propósito.
 *
 * Esta landing carrega o Meta Pixel (ver META_PIXEL_ID abaixo). A política do
 * app diz, em inglês, "We do not track you across other apps or websites. We do
 * not sell or share your data with advertisers" — verdade lá dentro, e o
 * oposto do que acontece AQUI. Apontar para ela seria publicar uma promessa que
 * esta própria página quebra no primeiro carregamento.
 *
 * A do blog cobre exatamente este caso: nomeia o Meta Pixel, diz o que ele
 * recebe (visita, não dado financeiro) e como limitar. Os TERMOS continuam
 * sendo os do app, que é o que eles de fato regem.
 */
export const PRIVACY_URL = "https://blog.pacafinance.com.br/privacidade";
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

/**
 * META PIXEL — o MESMO conjunto de dados do blog, de propósito.
 *
 * O percurso que interessa medir atravessa os três domínios: a pessoa chega
 * pelo anúncio num artigo, passa por esta página e cria a conta no app. Com um
 * pixel por site esse caminho viraria três medições soltas que não se ligam, e
 * a pergunta que decide o gasto — quanto custa um cadastro vindo do Meta —
 * ficaria sem resposta.
 *
 * O que NUNCA pode ser enviado: valor, saldo, renda, orçamento. O Paca é app de
 * finanças e as Ferramentas Comerciais da Meta proíbem receber dado financeiro
 * (o aviso está no próprio diálogo de criação do pixel). Só visita de página e
 * criação de conta, sem número junto.
 */
export const META_PIXEL_ID = "1762784665056623";

/**
 * Domínios onde o pixel pode disparar. Sem esta guarda ele contaria a nossa
 * própria navegação em localhost e nos deploys de pré-visualização da Vercel,
 * que são build de produção como qualquer outro.
 */
export const TRACKED_HOSTS = [
  "pacafinance.com.br",
  "www.pacafinance.com.br",
  "blog.pacafinance.com.br",
  "app.pacafinance.com.br",
];
