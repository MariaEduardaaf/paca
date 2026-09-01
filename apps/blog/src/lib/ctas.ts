/**
 * CTA de produto por artigo — um texto para cada dor.
 *
 * O CTABox aceita `title`, `body` e `buttonLabel`, mas até aqui nenhuma página
 * passava nada: o mesmo "Chega de planilha" fechava o artigo sobre brigas de
 * casal, o de conta conjunta e o de planilha. No artigo de brigas isso é um
 * non sequitur — quem chegou lá não está procurando substituir planilha.
 *
 * Regras deste arquivo:
 *  - a promessa nasce do problema DAQUELE artigo (visibilidade compartilhada no
 *    de brigas; unificar a visão sem unificar o banco no de conta conjunta;
 *    ninguém virar o contador da casa no de morar junto...);
 *  - texto curto: uma frase de título, duas de corpo;
 *  - a segunda frase costuma ser a ressalva honesta (inclusive contra o próprio
 *    produto) — é a voz do blog, não uma concessão;
 *  - o rótulo do botão diz o que acontece no clique: o destino é o cadastro.
 *
 * Slug sem entrada aqui cai no texto padrão do CTABox (as props ficam de fora e
 * os defaults do componente valem). Artigo novo nunca fica sem CTA, e o texto
 * padrão vive num lugar só — aqui não há cópia dele para sair do ar.
 */
export interface PostCta {
  /** Uma frase. É o que promete a saída para a dor do artigo. */
  title: string;
  /** Duas frases: o que o Paca faz + a ressalva honesta. */
  body: string;
  /** Rótulo do botão. Sempre explícito de que o destino é o cadastro. */
  buttonLabel: string;
}

/** Chave = `post.id` (o slug do arquivo em src/content/blog). */
export const POST_CTAS: Record<string, PostCta> = {
  "brigas-por-dinheiro-relacionamento": {
    title: "O gasto escondido some quando os dois veem o mesmo painel",
    body: "No Paca, cada despesa registrada aparece na hora para as duas pessoas — a briga da descoberta perde o combustível, porque ninguém precisa interrogar ninguém no fim do mês. Ressalva honesta: se esconder virou padrão, a conversa (ou a terapia de casal) vem antes do app.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },

  "conta-conjunta-vale-a-pena": {
    title: "Unificar a visão sem unificar o banco",
    body: "Cada um segue com a sua conta, os seus cartões e o seu Pix, e os gastos da casa aparecem juntos num painel só, com orçamento por categoria. Não substitui a conta conjunta para pagar boleto — resolve a outra metade, que é enxergar o dinheiro da casa no mesmo lugar.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },

  "planilha-gastos-casal": {
    title: "A parte chata da planilha é digitar",
    body: "No Paca, a notinha do mercado vira lançamento pela foto e o gasto já aparece para os dois, com o acerto do mês calculado. Se a planilha de vocês roda há meses sem atrito, fiquem com ela: o app resolve o problema de quem abandona planilha, não de quem mantém uma feliz.",
    buttonLabel: "Criar a conta e testar um mês",
  },

  "morar-junto-dividir-despesas": {
    title: "Ninguém precisa virar o contador oficial da casa",
    body: "Os dois lançam do próprio celular e o saldo de quem deve o quê se atualiza sozinho — a carga mental de anotar, somar e cobrar deixa de morar num dos dois. O combinado de quem paga o quê continua sendo de vocês; o app só para de deixar isso na memória de uma pessoa.",
    buttonLabel: "Criar a conta antes da mudança",
  },

  "como-juntar-dinheiro-casal": {
    title: "A revisão mensal em 5 minutos, não numa noite",
    body: "Com metas compartilhadas e orçamento por categoria, os dois registram ao longo do mês e, no dia do ritual, os números já estão lá — atualizados para os dois. Ver a barra encher ajuda, mas quem não pula a revisão (e comemora os 25%) continua sendo vocês.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },

  "dividir-contas-proporcional-ao-salario": {
    title: "A proporção aplicada sozinha, todo mês",
    body: "Vocês definem os percentuais uma vez e cada gasto compartilhado já entra com a parte de cada um calculada: no fim do mês sobra conferir o acerto e fazer um Pix. Revisar a proporção quando a renda mudar continua sendo tarefa de vocês — isso nenhum app adivinha.",
    buttonLabel: "Criar a conta e testar neste mês",
  },

  "como-dividir-contas-casal": {
    title: "Qualquer um dos quatro métodos, um registro só",
    body: "50/50, proporcional, conta conjunta ou por responsabilidades: os dois registram na hora e o app mostra quem pagou o quê e o saldo de cada um, sem ninguém precisar cobrar. Ele não escolhe o método por vocês — e, como a planilha, morre se um dos dois parar de lançar.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },

  "como-falar-de-dinheiro-relacionamento": {
    title: "A reunião mensal com a pauta já pronta",
    body: "Em vez de caçar comprovante e somar Pix na véspera, vocês abrem o painel juntos: os totais por categoria já estão lá, lançados pelos dois ao longo do mês. O que muda a relação é o ritual da conversa — o app só tira o trabalho de preparar.",
    buttonLabel: "Criar a conta antes da próxima reunião",
  },

  "regra-50-30-20-casal": {
    title: "Os três baldes se enchendo em tempo real",
    body: "Vocês criam orçamentos por categoria que espelham necessidades, desejos e objetivos, e cada gasto lançado por qualquer um dos dois consome o teto na hora — sem descobrir o estouro no dia 30. Quais percentuais cabem na renda de vocês, aí é decisão de vocês: 50/30/20, 60/25/15 ou 70/20/10.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },

  "melhor-app-financas-casal": {
    title: "Testem o nosso antes de comparar preço",
    body: "O plano grátis inclui scanner de nota e conselheiro de compras com limites mensais — o bastante para ver se os dois realmente lançam antes de pagar qualquer coisa. E somos parte interessada nesta lista: se outro app daqui encaixa melhor no caso de vocês, fiquem com ele.",
    buttonLabel: "Criar a conta grátis e comparar",
  },

  "bem-vindos-ao-blog-do-paca": {
    title: "O app por trás do blog",
    body: "O Paca organiza o dinheiro do casal num lugar só: gastos compartilhados em tempo real, contas divididas do jeito que vocês combinaram e metas a dois. Os guias daqui funcionam com ou sem ele — inclusive com a planilha que vocês já têm.",
    buttonLabel: "Criar a conta do casal (grátis)",
  },
};

/**
 * CTA do artigo, ou nada.
 *
 * Devolve `{}` de propósito quando o slug não tem entrada: espalhado no CTABox
 * (`<CTABox {...ctaFor(id)} />`), isso deixa os defaults do componente valerem,
 * em vez de manter aqui uma segunda cópia do texto padrão que pode divergir.
 */
export function ctaFor(slug: string): PostCta | Record<string, never> {
  return POST_CTAS[slug] ?? {};
}
