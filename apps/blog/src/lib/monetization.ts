/**
 * Monetization config — as duas chaves do blog.
 *
 * A rede fica desacoplada atrás do AdSlot.astro de propósito: trocar
 * AdSense -> AdSeleto (AdX) mais tarde toca só este arquivo + aquele componente.
 *
 * SÃO DUAS CHAVES, E NÃO UMA. A versão anterior tinha só `ADSENSE_CLIENT`
 * governando as duas coisas abaixo, e isso quebrou na prática: assim que o
 * `pub-` foi preenchido na Vercel (necessário para o Google verificar o site),
 * os blocos de anúncio passaram a ser desenhados também — e blocos de anúncio
 * SEM `data-ad-slot` nunca preenchem. Resultado no ar: duas faixas de 280px em
 * branco por artigo, com o rótulo "Publicidade" em cima de nada, justamente
 * enquanto o revisor do AdSense estava olhando o site.
 *
 * 1. ADSENSE_CLIENT (PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX)
 *    Carrega o script do Google no <head>. É o código de verificação do site:
 *    precisa estar no ar DURANTE a análise, antes de existir qualquer anúncio.
 *    Preencher também public/ads.txt com o mesmo pub-.
 *
 * 2. AD_SLOT_IDS (PUBLIC_ADSENSE_SLOT_*)
 *    O ID de cada bloco de anúncio, gerado no painel do AdSense em
 *    Anúncios > Por unidade de anúncio. Esses IDs SÓ EXISTEM DEPOIS DA
 *    APROVAÇÃO — é por isso que eles são uma chave separada.
 *
 * Enquanto o ID de um bloco estiver vazio, aquele bloco não é desenhado: nada
 * de espaço morto, nada de rótulo sobre o vazio. No dia em que os IDs forem
 * preenchidos na Vercel, os anúncios aparecem sozinhos — sem mudar código.
 */
export const ADSENSE_CLIENT: string =
  import.meta.env.PUBLIC_ADSENSE_CLIENT || "";

/** O script do Google no <head> (verificação do site + Anúncios Automáticos). */
export const ADS_ENABLED = ADSENSE_CLIENT.length > 0;

/**
 * ID do bloco de anúncio por posição. A chave é a mesma `placement` que as
 * páginas passam para o AdSlot, para o call site continuar falando de ONDE o
 * anúncio vive e não de qual número ele tem.
 */
export const AD_SLOT_IDS: Record<string, string> = {
  "first-fold": import.meta.env.PUBLIC_ADSENSE_SLOT_FIRST_FOLD || "",
  "in-content": import.meta.env.PUBLIC_ADSENSE_SLOT_IN_CONTENT || "",
};

/** ID do bloco, ou "" quando ainda não existe (aí o bloco não é desenhado). */
export function adSlotId(placement: string): string {
  return AD_SLOT_IDS[placement] || "";
}

/**
 * META PIXEL — a medição do tráfego pago.
 *
 * POR QUE ESTE ESTÁ NO CÓDIGO E O ADSENSE ESTÁ EM VARIÁVEL DE AMBIENTE.
 * O ID do pixel é público por natureza: ele aparece no código-fonte de toda
 * página que o carrega, e qualquer visitante lê. Não há segredo a proteger,
 * então a variável de ambiente só acrescentaria um passo manual — e foi
 * exatamente esse passo que já falhou uma vez aqui: o `pub-` do AdSense foi
 * preenchido na Vercel e ninguém republicou, então o site ficou dias com o
 * comportamento antigo enquanto parecia configurado. Com o valor no código,
 * publicar é ligar.
 *
 * O QUE NUNCA PODE SER ENVIADO. O Paca é app de finanças, e as Ferramentas
 * Comerciais da Meta proíbem receber "informações financeiras" — o aviso está
 * no próprio diálogo de criação do pixel. Então: nada de valor de transação,
 * saldo, renda ou orçamento, nem como evento, nem como parâmetro. O que se
 * envia é visita de página e criação de conta, sem número junto. Enviar o
 * volume movimentado seria a métrica óbvia de um app financeiro e é justamente
 * a que derruba o conjunto de dados.
 */
export const META_PIXEL_ID = "1762784665056623";

/**
 * Domínios onde o pixel pode disparar.
 *
 * Sem esta lista o pixel dispararia também em `localhost` e nos deploys de
 * pré-visualização da Vercel (que são build de produção como qualquer outro),
 * sujando a medição com a nossa própria navegação — e é essa medição que vai
 * decidir quanto gastar no Meta.
 */
export const TRACKED_HOSTS = [
  "blog.pacafinance.com.br",
  "pacafinance.com.br",
  "www.pacafinance.com.br",
  "app.pacafinance.com.br",
];
