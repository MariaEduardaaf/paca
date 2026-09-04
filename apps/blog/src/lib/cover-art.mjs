/**
 * CAPAS DO BLOG — MARCAÇÃO E REGRAS, FONTE ÚNICA DE VERDADE
 *
 * Este arquivo desenha a capa; src/styles/cover.css a estiliza. Juntos são o
 * sistema inteiro, e os renderizadores apenas consomem:
 *   - scripts/capas.mjs → PNG da capa do site (palavra gigante = CATEGORIA),
 *     em public/capas/<slug>.png;
 *   - scripts/og.mjs    → PNG do card de compartilhamento (palavra gigante = TÍTULO),
 *     em public/og/<slug>.png.
 * É `.mjs` (JS puro, sem tipos) porque os dois scripts rodam em Node cru, sem build.
 *
 * src/components/Cover.astro NÃO desenha mais nada: ele só aponta um <img> para
 * o PNG de public/capas/ (e usa `coverAlt()` daqui). O desenho em HTML/CSS
 * sobrou lá apenas como rede para o PNG que ainda não foi gerado — ver o
 * cabeçalho do componente para o porquê da troca.
 *
 * POR QUE HTML/CSS E NÃO SVG (o sistema anterior era SVG)
 * O desenho é caixa, texto e uma foto: tudo que HTML faz melhor. Em SVG o texto
 * não quebra linha sozinho — o gerador antigo precisava estimar largura de
 * glifo para caber o título, e errava em acento e em título longo. Aqui o
 * navegador quebra, e como o og.mjs já renderiza HTML no Chrome, a MESMA
 * marcação serve os dois lados sem tradução.
 *
 * A ARTE (caixa de 1200x630, do canvas do Claude Design)
 *   pílula da categoria   left 76,  top 64
 *   elemento gráfico      right 64, top 52
 *   palavra gigante       left 70,  top 150
 *   endereço do blog      left 76,  bottom 60
 *   mascote               right 56, bottom 44, altura 400
 * Todo número vira `calc(N * var(--u))` — ver o cabeçalho de cover.css.
 */

/** Endereço no rodapé da capa. Espelha SITE_URL de src/consts.ts (que é TS). */
export const COVER_ADDRESS = "blog.pacafinance.com.br";

/**
 * Caminho público dos dois recortes do mascote (claro p/ fundo escuro/rosa).
 *
 * NÃO APAGUE ESSES DOIS PNGs numa limpeza de asset "não usado". Desde que a
 * capa virou <img>, NENHUMA página do site pede /paca-mascote*.png: o mascote
 * está assado dentro de cada PNG de public/capas/ e public/og/. Uma busca por
 * referência no HTML buildado devolve zero — e mesmo assim os dois arquivos são
 * a MATÉRIA-PRIMA dos dois geradores (`npm run capas` e `npm run og` os leem
 * daqui e os embutem como data URI). Sem eles, os dois scripts quebram.
 */
export const MASCOT_SRC = {
  light: "/paca-mascote.png",
  dark: "/paca-mascote-dark.png",
};

// ---------------------------------------------------------------------------
// TEMAS DE FUNDO
// ---------------------------------------------------------------------------

/**
 * Três fundos que se alternam entre os artigos — é o que dá ritmo à grade da
 * home (a reclamação do sistema antigo era justamente a grade parecer repetida).
 *
 * Papéis de cor dentro do motivo geométrico:
 *   `c1` forma principal · `c2` forma secundária · `cut` vazado (= a cor do fundo).
 *
 * @typedef {{ id: string, bg: string, ink: string, pillBg: string,
 *             pillText: string, address: string, c1: string, c2: string,
 *             cut: string, mascot: "light" | "dark" }} CoverTheme
 * @type {Record<string, CoverTheme>}
 */
export const THEMES = {
  rosa: {
    id: "rosa",
    bg: "#FF8FB1",
    ink: "#4A0A1F",
    pillBg: "#4A0A1F",
    pillText: "#FFD3E1",
    address: "rgba(74,10,31,.7)",
    c1: "#4A0A1F",
    c2: "rgba(255,250,246,.8)",
    cut: "#FF8FB1",
    mascot: "light",
  },
  preto: {
    id: "preto",
    bg: "#1C1917",
    ink: "#FFFAF6",
    pillBg: "#FF8FB1",
    pillText: "#1C1917",
    address: "rgba(255,250,246,.6)",
    c1: "#FF8FB1",
    c2: "rgba(255,250,246,.85)",
    cut: "#1C1917",
    mascot: "light",
  },
  creme: {
    id: "creme",
    bg: "#F3EDE6",
    ink: "#1C1917",
    pillBg: "#FF8FB1",
    pillText: "#1C1917",
    address: "#7A6F66",
    c1: "#1C1917",
    c2: "#FF8FB1",
    cut: "#F3EDE6",
    mascot: "dark",
  },
};

export const THEME_IDS = ["rosa", "preto", "creme"];

// ---------------------------------------------------------------------------
// ELEMENTO GRÁFICO DO CANTO (14 motivos)
// ---------------------------------------------------------------------------

/** `calc(N * var(--u))` — todo número da spec passa por aqui. */
const u = (n) => `calc(${n} * var(--u))`;

/** Bloco retangular simples. */
const box = (w, h, radius, fill, extra = "") =>
  `<div style="width:${u(w)};height:${u(h)};border-radius:${radius};background:${fill};${extra}"></div>`;

/** Barra dividida em duas cores, com proporções diferentes (spec: flex 1/1, 2/1…). */
const splitBar = (w, h, top, bottom, c1, c2) =>
  `<div style="display:flex;flex-direction:column;width:${u(w)};height:${u(h)};border-radius:${u(6)};overflow:hidden">` +
  `<div style="flex:${top};background:${c1}"></div>` +
  `<div style="flex:${bottom};background:${c2}"></div></div>`;

const row = (gap, align, children) =>
  `<div style="display:flex;align-items:${align};gap:${u(gap)}">${children}</div>`;

/**
 * Cada motivo é uma função (theme) => HTML. Regras de família (o que faz os 14
 * parecerem o mesmo sistema): no máximo duas cores + o vazado; nada maior que
 * ~250u de largura ou ~112u de altura; nenhum texto; formas geométricas simples.
 *
 * @type {Record<string, (t: CoverTheme) => string>}
 */
export const MOTIFS = {
  /** Quatro barras divididas — o motivo da spec. */
  "bars-split": (t) =>
    row(
      14,
      "flex-end",
      splitBar(26, 66, 1, 1, t.c1, t.c2) +
        splitBar(26, 88, 2, 1, t.c1, t.c2) +
        splitBar(26, 78, 1, 3, t.c1, t.c2) +
        splitBar(26, 110, 3, 2, t.c1, t.c2),
    ),

  /** Duas barras largas em proporções invertidas — desigualdade de renda. */
  "bars-duo": (t) =>
    row(
      16,
      "flex-end",
      splitBar(34, 110, 7, 3, t.c1, t.c2) + splitBar(34, 66, 3, 7, t.c1, t.c2),
    ),

  /** Seis barras subindo: as três últimas já na cor forte — acúmulo. */
  "bars-rising": (t) =>
    row(
      11,
      "flex-end",
      [34, 49, 64, 79, 94, 110]
        .map((h, i) => box(22, h, u(5), i < 3 ? t.c2 : t.c1))
        .join(""),
    ),

  /** Alvo concêntrico — a meta. */
  target: (t) =>
    `<div style="position:relative;width:${u(112)};height:${u(112)};display:flex;align-items:center;justify-content:center">` +
    `<div style="position:absolute;inset:0;border-radius:999px;border:${u(3)} solid ${t.c2}"></div>` +
    `<div style="position:absolute;width:${u(74)};height:${u(74)};border-radius:999px;border:${u(3)} solid ${t.c2}"></div>` +
    box(40, 40, "999px", t.c1) +
    `</div>`,

  /** Um círculo cheio e um tracejado se sobrepondo — um presente, um faltando. */
  "circles-overlap": (t) =>
    `<div style="display:flex;align-items:center">` +
    box(96, 96, "999px", t.c1) +
    `<div style="width:${u(96)};height:${u(96)};border-radius:999px;border:${u(3)} dashed ${t.c2};box-sizing:border-box;margin-left:${u(-26)}"></div>` +
    `</div>`,

  /** Dois círculos de tamanhos muito diferentes. */
  "circles-pair": (t) =>
    row(16, "center", box(96, 96, "999px", t.c1) + box(44, 44, "999px", t.c2)),

  /** Duas faixas empilhadas do mesmo tamanho — duas contas iguais. */
  "stack-two": (t) =>
    `<div style="display:flex;flex-direction:column;gap:${u(12)}">` +
    box(200, 46, u(12), t.c2) +
    box(200, 46, u(12), t.c1) +
    `</div>`,

  /** Duas faixas empilhadas de larguras diferentes — limites diferentes. */
  "stack-step": (t) =>
    `<div style="display:flex;flex-direction:column;gap:${u(12)};align-items:flex-end">` +
    box(200, 46, u(12), t.c1) +
    box(124, 46, u(12), t.c2) +
    `</div>`,

  /** Uma faixa fatiada em 5/3/2 — o orçamento repartido. */
  "bar-thirds": (t) =>
    `<div style="display:flex;width:${u(246)};height:${u(44)};border-radius:${u(10)};overflow:hidden">` +
    `<div style="flex:5;background:${t.c1}"></div>` +
    `<div style="flex:3;background:${t.c2}"></div>` +
    `<div style="flex:2;background:${t.c1};opacity:.45"></div>` +
    `</div>`,

  /** Grade 3x2 alternada — a planilha. */
  "grid-checker": (t) =>
    `<div style="display:grid;grid-template-columns:repeat(3,${u(34)});gap:${u(12)}">` +
    Array.from({ length: 6 }, (_, i) =>
      box(34, 34, u(10), i % 2 === 0 ? t.c1 : t.c2),
    ).join("") +
    `</div>`,

  /** Grade 4x3 com a primeira linha preenchida — progresso de um plano. */
  "grid-progress": (t) =>
    `<div style="display:grid;grid-template-columns:repeat(4,${u(48)});gap:${u(5)}">` +
    Array.from({ length: 12 }, (_, i) =>
      box(48, 26, u(4), i < 4 ? t.c1 : t.c2),
    ).join("") +
    `</div>`,

  /** Dois balões de fala encaixados — a conversa. */
  "bubbles-pair": (t) =>
    `<div style="display:flex;align-items:flex-end">` +
    box(104, 64, `${u(16)} ${u(16)} ${u(4)} ${u(16)}`, t.c1) +
    box(
      104,
      64,
      `${u(16)} ${u(16)} ${u(16)} ${u(4)}`,
      t.c2,
      `margin-left:${u(-18)};margin-bottom:${u(26)};`,
    ) +
    `</div>`,

  /** Duas arcadas lado a lado — o telhado, a casa. */
  arches: (t) =>
    row(
      14,
      "flex-end",
      box(104, 110, `${u(52)} ${u(52)} ${u(8)} ${u(8)}`, t.c1) +
        box(64, 70, `${u(32)} ${u(32)} ${u(8)} ${u(8)}`, t.c2),
    ),

  /** Um balão com reticências — o começo de uma conversa. */
  "bubble-dots": (t) =>
    `<div style="width:${u(150)};height:${u(88)};border-radius:${u(20)} ${u(20)} ${u(20)} ${u(4)};background:${t.c1};display:flex;align-items:center;justify-content:center;gap:${u(14)}">` +
    box(16, 16, "999px", t.cut).repeat(3) +
    `</div>`,
};

export const MOTIF_NAMES = Object.keys(MOTIFS);

/**
 * Um motivo por artigo — a metáfora do texto, não enfeite.
 * REGRA DURA: dois artigos da MESMA categoria nunca repetem o motivo (a capa
 * de categoria conta como um dos artigos daquela categoria). Quem valida é
 * `auditCovers()`, chamado pelo `npm run og` — não confie na memória.
 * @type {Record<string, keyof typeof MOTIFS>}
 */
export const MOTIF_BY_SLUG = {
  // dividir-contas
  "como-dividir-contas-casal": "bars-split",
  "dividir-contas-proporcional-ao-salario": "bars-duo",
  "morar-junto-dividir-despesas": "arches",
  "um-dos-dois-desempregado-financas-casal": "circles-overlap",
  // organizacao
  "regra-50-30-20-casal": "bar-thirds",
  "conta-conjunta-vale-a-pena": "circles-pair",
  "conta-conjunta-nubank": "stack-two",
  "cartao-de-credito-casal": "stack-step",
  "casal-endividado-como-sair-das-dividas": "grid-progress",
  "bem-vindos-ao-blog-do-paca": "bubble-dots",
  // metas-e-sonhos
  "reserva-de-emergencia-casal": "target",
  "comprar-casa-juntos-financiamento": "arches",
  "como-juntar-dinheiro-casal": "bars-rising",
  "quanto-custa-casar": "grid-progress",
  // ferramentas
  "melhor-app-financas-casal": "bars-split",
  "planilha-gastos-casal": "grid-checker",
  // conversas-sobre-dinheiro
  "como-falar-de-dinheiro-relacionamento": "bubbles-pair",
  "brigas-por-dinheiro-relacionamento": "circles-overlap",
  // conversas-sobre-dinheiro (novos de setembro; escolhidos pelo sentido e sem
  // repetir vizinho: bars-duo = duas rendas desiguais; circles-pair = o casal e
  // os pais; bubble-dots = a conversa que ainda nao aconteceu)
  "quando-um-sustenta-o-outro": "bars-duo",
  "ajudar-os-pais-financeiramente-casal": "circles-pair",
  "divida-escondida-do-parceiro": "bubble-dots",
  // dividir-contas
  "renda-extra-no-casal": "bars-rising",
};

/**
 * Rede de segurança: artigo novo ainda sem entrada acima cai no motivo da
 * categoria. Nunca fica sem capa e nunca quebra o build. É também o motivo das
 * capas das PÁGINAS de categoria (que chamam Cover com slug = id da categoria).
 * @type {Record<string, keyof typeof MOTIFS>}
 */
export const MOTIF_BY_CATEGORY = {
  "dividir-contas": "bars-split",
  organizacao: "stack-two",
  "conversas-sobre-dinheiro": "bubbles-pair",
  "metas-e-sonhos": "target",
  ferramentas: "grid-checker",
};

export const DEFAULT_MOTIF = "bars-split";

export function motifNameFor(slug, category) {
  return MOTIF_BY_SLUG[slug] || MOTIF_BY_CATEGORY[category] || DEFAULT_MOTIF;
}

// ---------------------------------------------------------------------------
// PALAVRA GIGANTE
// ---------------------------------------------------------------------------

/**
 * A categoria em corpo enorme, com as quebras de linha DO CANVAS (inclusive as
 * hifenizadas). São fixas de propósito: quebra automática mudaria de lugar
 * conforme a fonte carregada ou o navegador, e a capa é a mesma arte em quatro
 * tamanhos diferentes — tinha que quebrar igual em todos.
 *
 * ORÇAMENTO DE LARGURA — 700u, e ele é DURO
 * A palavra começa em x=70 e a orelha do mascote começa em x=804 (mascote de
 * 400u de altura, proporção 681x800 => 340u de largura, encostado em right:56).
 * Sobram 734u; 700u deixa ~34u de respiro. Como as linhas são fixas, uma linha
 * de palavra ÚNICA não tem onde quebrar: ela simplesmente VAZA o `max-width` e
 * sobe por cima do mascote — foi o que aconteceu com "CONVERSAS" a 140 (801u).
 * `max-width` sozinho NÃO protege disso; quem protege é o `size` daqui.
 *
 * Larguras medidas no Chrome (Bricolage 800, tracking -.05em, caixa alta), na
 * caixa de 1200 — refaça a medição se mudar um rótulo ou uma quebra:
 *   "contas"    653u @172   "Organi-"  704u @172   "Metas e" 697u @172
 *   "mentas"    672u @172   "Conversas" 687u @120  (era 801u @140 => vazava)
 *
 * @type {Record<string, { lines: string[], size: number, leading: number }>}
 */
export const CATEGORY_WORD = {
  "dividir-contas": { lines: ["Dividir", "contas"], size: 172, leading: 0.84 },
  /* Entrelinha 0.84 como todas as outras — e sim, o til do "Ã" de ZAÇÃO encosta
     e se funde com o "A" de ORGANI- da linha de cima. Isso é DE PROPÓSITO: é
     exatamente o que está no canvas aprovado da dona (confira o recorte de
     "Capas Paca Finance-selection4.png"), onde o til se aninha no vão do A.
     Se um dia ela decidir que lê como defeito e não como tipografia apertada,
     0.90 abre o suficiente para o til passar limpo sem soltar o bloco — é este
     número aqui, e só ele. */
  organizacao: { lines: ["Organi-", "zação"], size: 172, leading: 0.84 },
  "metas-e-sonhos": { lines: ["Metas e", "sonhos"], size: 172, leading: 0.84 },
  ferramentas: { lines: ["Ferra-", "mentas"], size: 172, leading: 0.84 },
  /* Corpo 120, não 172 como as outras: "CONVERSAS" é uma palavra só e não pode
     quebrar, então o corpo é ditado pela LARGURA. Ver o orçamento de 700u
     acima — a 140 ela mede 801u e passava POR CIMA da orelha do mascote. */
  "conversas-sobre-dinheiro": {
    lines: ["Conversas", "sobre", "dinheiro"],
    size: 120,
    leading: 0.86,
  },
};

/**
 * Corpo do TÍTULO no card de compartilhamento, por faixa de comprimento.
 * Calibrado para a coluna de 700u (o que sobra à esquerda do mascote) e para a
 * altura livre entre o topo em 150u e o endereço em 570u — o título mais longo
 * dos artigos de hoje (69 caracteres) cai na faixa de 58 e ocupa 4 linhas.
 * Título é sempre em caixa NORMAL aqui: a gigante em maiúsculas é a categoria.
 */
export function titleSize(title) {
  const n = title.length;
  if (n <= 26) return { size: 100, leading: 0.92 };
  if (n <= 36) return { size: 88, leading: 0.93 };
  if (n <= 48) return { size: 76, leading: 0.95 };
  if (n <= 60) return { size: 66, leading: 0.97 };
  if (n <= 74) return { size: 58, leading: 0.99 };
  return { size: 50, leading: 1.02 };
}

// ---------------------------------------------------------------------------
// TEXTO ALTERNATIVO — o que o Google Imagens lê
// ---------------------------------------------------------------------------

/**
 * O ASSUNTO DE CADA CAPA EM UMA FRASE — e por que isto passou a existir.
 *
 * Enquanto a capa era desenhada em HTML/CSS ela era DECORATIVA e ia com
 * `aria-hidden`: tudo que ela dizia (a categoria, o título) já estava escrito
 * em texto de verdade ao lado, e repetir só faria o leitor de tela ouvir duas
 * vezes a mesma coisa. Virando <img> a conta muda de lado — o `alt` passa a
 * ser o ÚNICO texto que o Google Imagens tem sobre o arquivo, e imagem sem
 * `alt` não entra em busca de imagem nem no card grande do Discover.
 *
 * A tensão se resolve escrevendo um `alt` que descreve A IMAGEM (uma capa
 * tipográfica: fundo colorido, a categoria em corpo enorme, o mascote) E o
 * assunto do texto. Continua honesto para quem ouve, porque descreve o que
 * está na tela em vez de repetir o título que vem na linha seguinte, e passa a
 * ser útil para quem indexa.
 *
 * REGRAS DESTAS FRASES — não quebre ao publicar artigo novo:
 *  - não repetir o título palavra por palavra: ele já está no <h1>/<h2> ao
 *    lado, e `alt` igual ao título é a marca de página gerada em série;
 *  - nada de lista de palavra-chave: descreva o assunto como se estivesse
 *    explicando a imagem para alguém no telefone;
 *  - uma frase curta, ~45 a 60 caracteres — o `alt` montado fica em ~150;
 *  - a frase entra depois de "sobre ", então comece por verbo ou substantivo
 *    (escreva "quitar as dívidas…", não "como quitar as dívidas…").
 * @type {Record<string, string>}
 */
export const ALT_SUBJECT_BY_SLUG = {
  // dividir-contas
  "como-dividir-contas-casal":
    "as formas de repartir as despesas da casa entre duas pessoas",
  "dividir-contas-proporcional-ao-salario":
    "dividir as despesas na proporção do que cada um ganha",
  "morar-junto-dividir-despesas":
    "combinar quem paga o quê antes de ir morar junto",
  "um-dos-dois-desempregado-financas-casal":
    "reorganizar o orçamento do casal quando uma renda acaba",
  // organizacao
  "regra-50-30-20-casal":
    "repartir o salário em três fatias quando as rendas são duas",
  "conta-conjunta-vale-a-pena":
    "quando abrir uma conta em nome dos dois compensa",
  "conta-conjunta-nubank":
    "o que o Nubank oferece a quem procura conta a dois",
  "cartao-de-credito-casal":
    "usar cartão adicional, fatura junta ou cartões separados",
  "casal-endividado-como-sair-das-dividas":
    "quitar as dívidas a dois sem virar cobrança dentro de casa",
  "bem-vindos-ao-blog-do-paca":
    "o que este blog publica para quem cuida do dinheiro a dois",
  // metas-e-sonhos
  "reserva-de-emergencia-casal":
    "quanto guardar para imprevistos quando são duas rendas",
  "comprar-casa-juntos-financiamento":
    "financiar o imóvel em nome dos dois, do FGTS ao cartório",
  "como-juntar-dinheiro-casal":
    "transformar um objetivo do casal em valor guardado por mês",
  "quanto-custa-casar":
    "os custos de uma festa de casamento e o teto do orçamento",
  // ferramentas
  "melhor-app-financas-casal":
    "comparar aplicativos que o casal usa para acompanhar gastos",
  "planilha-gastos-casal":
    "montar uma planilha de despesas compartilhada entre os dois",
  // conversas-sobre-dinheiro
  "como-falar-de-dinheiro-relacionamento":
    "trazer o assunto dinheiro para a mesa sem virar discussão",
  "brigas-por-dinheiro-relacionamento":
    "por que dinheiro vira briga e como sair desse ciclo",
};

/**
 * Rede de segurança: artigo novo ainda sem frase acima cai no assunto da
 * categoria — nunca fica sem `alt`, que é o pior dos mundos (imagem invisível
 * para a busca E para quem ouve). É também o assunto das capas das PÁGINAS de
 * categoria, que chamam o Cover com slug = id da categoria.
 * @type {Record<string, string>}
 */
export const ALT_SUBJECT_BY_CATEGORY = {
  "dividir-contas": "as formas de repartir as despesas do casal",
  organizacao: "a rotina financeira do casal no dia a dia",
  "conversas-sobre-dinheiro": "falar de dinheiro com quem você ama",
  "metas-e-sonhos": "planejar os objetivos do casal com prazo e valor",
  ferramentas: "apps e planilhas para o casal cuidar do dinheiro",
};

export const DEFAULT_ALT_SUBJECT = "as finanças do casal no dia a dia";

export function altSubjectFor(slug, category) {
  return (
    ALT_SUBJECT_BY_SLUG[slug] ||
    ALT_SUBJECT_BY_CATEGORY[category] ||
    DEFAULT_ALT_SUBJECT
  );
}

/**
 * O `alt` da capa, montado.
 *
 * O nome do fundo sai do próprio id do tema — "rosa", "preto" e "creme" já são
 * as palavras em pt-BR, então não existe segunda tabela de cor para
 * dessincronizar.
 *
 * @param {{slug: string, category: string, categoryLabel?: string}} opts
 * @returns {string}
 */
export function coverAlt({ slug, category, categoryLabel }) {
  const label = categoryLabel || category;
  const paint = themeIdFor(slug);
  const subject = altSubjectFor(slug, category);

  // A página de categoria chama o Cover com slug = id da própria categoria (é
  // a convenção do componente). Ali a capa não é de nenhum artigo, e dizer
  // "capa do artigo" seria mentira para quem só ouve o alt.
  // Travessão e não "sobre": um dos rótulos JÁ é "Conversas sobre dinheiro", e
  // com "sobre" o alt saía "Capa da seção Conversas sobre dinheiro, sobre
  // falar de dinheiro…". Alt é texto que alguém ouve — tem de ler bem em voz
  // alta, não só passar no validador.
  if (slug === category) {
    return (
      `Capa da seção ${label} — ${subject}: fundo ${paint} com o nome ` +
      `da seção em letra grande e o mascote do Paca.`
    );
  }

  return (
    `Capa do artigo sobre ${subject}: fundo ${paint}, a palavra ${label} ` +
    `em letra grande e o mascote do Paca.`
  );
}

// ---------------------------------------------------------------------------
// ROTAÇÃO DOS FUNDOS
// ---------------------------------------------------------------------------

/**
 * Hash determinístico por slug (murmur3 finalizer no fim). O embaralhamento
 * final não é enfeite: com o `*31` cru os bits BAIXOS quase não mudam entre
 * slugs parecidos, e é justamente deles que sai o `% 3`.
 */
export function hashSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  // `>>> 0` DEPOIS do XOR final, não antes: em JS o `^` devolve inteiro com
  // SINAL, então sem isso o hash sai negativo às vezes e `% 3` dá -1/-2 — o
  // índice do tema virava `undefined` em metade dos artigos.
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * FUNDO DE CADA ARTIGO — tabela explícita, e não só o hash. Por quê:
 *
 * A regra dura do sistema é de VIZINHANÇA, não de slug: dois artigos
 * consecutivos na listagem (ordem por data, mais novo primeiro) não podem
 * repetir o fundo — nem na grade geral da home, nem dentro de uma mesma
 * categoria. Vizinhança depende da ordem dos artigos, e o Cover.astro só recebe
 * `slug` e `category`: ele não tem como saber quem vem antes. Então a ordem é
 * resolvida UMA vez, aqui, e congelada — do mesmo jeito que MOTIF_BY_SLUG.
 *
 * O hash abaixo continua valendo como rede para artigo novo ainda não listado
 * (nunca fica sem capa), e o `auditCovers()` do `npm run og` reprova se o
 * sorteio dele quebrar a regra: aí é só trazer o slug para esta tabela.
 *
 * O QUE FAZ DUAS CAPAS PARECEREM IGUAIS (a regra que manda de verdade)
 * Na capa do SITE a palavra gigante é a CATEGORIA. Então dois artigos da mesma
 * categoria só se distinguem por DUAS coisas: o fundo e o motivo do canto — e o
 * motivo é pequeno. Na prática a identidade do card é o par (categoria, fundo).
 * Por isso o fundo tem de ser espalhado DENTRO de cada categoria, não só na
 * listagem geral: `organizacao` tem 6 artigos e recebe 2 de cada fundo (o
 * máximo que dá, por casa dos pombos). Uma versão anterior desta tabela deixava
 * TRÊS "ORGANIZAÇÃO" em creme — na grade da home eles liam como o mesmo card
 * repetido. Quem reprova isso agora é `auditCovers()`.
 *
 * Distribuição de hoje: 7 rosa, 6 preto, 5 creme (não fecha 6/6/6 porque as
 * regras de vizinhança mandam mais que o empate perfeito).
 * @type {Record<string, keyof typeof THEMES>}
 */
export const THEME_BY_SLUG = {
  // novos de setembro — resolvidos por busca de MINIMA mudanca: os 18 antigos
  // ficam como estao e so estes quatro entram (a busca gulosa cascateava 15
  // trocas; a de custo minimo achou atribuicao valida com zero)
  "renda-extra-no-casal": "preto", // dividir-contas
  "quando-um-sustenta-o-outro": "rosa", // conversas-sobre-dinheiro
  "ajudar-os-pais-financeiramente-casal": "preto", // conversas-sobre-dinheiro
  "divida-escondida-do-parceiro": "creme", // conversas-sobre-dinheiro
  // ordem de publicação, do mais novo para o mais antigo (= ordem da listagem).
  // Resolvido por busca, não à mão: as regras (vizinho na grade, vizinho DENTRO
  // da categoria, e teto de ceil(n/3) por fundo em cada categoria) se cruzam, e
  // mexer num fundo à mão costuma quebrar outra regra duas linhas abaixo.
  // Se a ordem dos artigos mudar, rode a busca de novo e confira com auditCovers().
  "quanto-custa-casar": "rosa", // metas-e-sonhos
  "casal-endividado-como-sair-das-dividas": "creme", // organizacao
  "comprar-casa-juntos-financiamento": "preto", // metas-e-sonhos
  "cartao-de-credito-casal": "rosa", // organizacao
  "reserva-de-emergencia-casal": "creme", // metas-e-sonhos
  "um-dos-dois-desempregado-financas-casal": "rosa", // dividir-contas
  "conta-conjunta-nubank": "preto", // organizacao
  "dividir-contas-proporcional-ao-salario": "creme", // dividir-contas
  "bem-vindos-ao-blog-do-paca": "rosa", // organizacao
  "melhor-app-financas-casal": "creme", // ferramentas
  "planilha-gastos-casal": "preto", // ferramentas
  "como-dividir-contas-casal": "rosa", // dividir-contas
  "brigas-por-dinheiro-relacionamento": "preto", // conversas-sobre-dinheiro
  "conta-conjunta-vale-a-pena": "creme", // organizacao
  "como-juntar-dinheiro-casal": "rosa", // metas-e-sonhos
  "regra-50-30-20-casal": "preto", // organizacao
  "morar-junto-dividir-despesas": "creme", // dividir-contas
  "como-falar-de-dinheiro-relacionamento": "rosa", // conversas-sobre-dinheiro

  // capas das PÁGINAS de categoria (Cover é chamado com slug = id da categoria),
  // na ordem em que a lista de /categorias as mostra
  organizacao: "rosa",
  "conversas-sobre-dinheiro": "creme",
  "metas-e-sonhos": "preto",
  "dividir-contas": "rosa",
  ferramentas: "creme",
};

/** Fundo do artigo: tabela acima; hash por slug como rede para slug novo. */
export function themeIdFor(slug) {
  return THEME_BY_SLUG[slug] || THEME_IDS[hashSlug(slug) % 3];
}

export function themeFor(slug) {
  return THEMES[themeIdFor(slug)];
}

// ---------------------------------------------------------------------------
// MARCAÇÃO
// ---------------------------------------------------------------------------

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * A capa inteira, pronta para ir dentro de um elemento `.paca-cover`.
 *
 * @param {object} opts
 * @param {string} opts.slug            identidade do artigo (define fundo e motivo)
 * @param {string} opts.category        id da categoria (src/lib/categories.ts)
 * @param {string} opts.categoryLabel   rótulo da pílula ("Dividir contas")
 * @param {"category"|"title"} opts.mode
 *   `category` → palavra gigante = a categoria em maiúsculas (capa do SITE, onde
 *   o título já aparece embaixo do card e repetir seria redundante).
 *   `title` → palavra gigante = o título do artigo (card de COMPARTILHAMENTO,
 *   que viaja sozinho e precisa se explicar).
 * @param {string} [opts.title]         obrigatório no modo `title`
 * @param {{light: string, dark: string}} [opts.mascot] de onde vem o PNG do mascote
 * @returns {{ html: string, theme: CoverTheme, style: string }}
 *   `style` traz as variáveis de cor e vai no elemento `.paca-cover`.
 */
export function coverArt({
  slug,
  category,
  categoryLabel,
  mode = "category",
  title = "",
  mascot = MASCOT_SRC,
}) {
  const theme = themeFor(slug);
  const motif = (MOTIFS[motifNameFor(slug, category)] || MOTIFS[DEFAULT_MOTIF])(
    theme,
  );

  let word;
  if (mode === "title") {
    const t = titleSize(title);
    word =
      `<div class="paca-cover__word paca-cover__word--title" ` +
      `style="font-size:${u(t.size)};line-height:${t.leading}">${escapeHtml(title)}</div>`;
  } else {
    const w = CATEGORY_WORD[category] || {
      lines: [categoryLabel || category],
      size: 140,
      leading: 0.86,
    };
    word =
      `<div class="paca-cover__word paca-cover__word--category" ` +
      `style="font-size:${u(w.size)};line-height:${w.leading}">` +
      w.lines.map(escapeHtml).join("<br />") +
      `</div>`;
  }

  const style =
    `--bg:${theme.bg};--ink:${theme.ink};--pill-bg:${theme.pillBg};` +
    `--pill-text:${theme.pillText};--address:${theme.address}`;

  const html =
    `<div class="paca-cover__stage">` +
    `<div class="paca-cover__pill">${escapeHtml(categoryLabel || category)}</div>` +
    `<div class="paca-cover__motif">${motif}</div>` +
    word +
    `<div class="paca-cover__address">${COVER_ADDRESS}</div>` +
    // Sem `loading="lazy"`: a capa do topo do artigo (e a de destaque da home)
    // é candidata a LCP. São só dois PNGs de ~18 KB, os mesmos em toda a grade,
    // então o cache resolve o resto da página.
    `<img class="paca-cover__mascot" src="${mascot[theme.mascot]}" alt="" decoding="async" />` +
    `</div>`;

  return { html, theme, style };
}

// ---------------------------------------------------------------------------
// AUDITORIA — as duas regras duras, verificadas de verdade
// ---------------------------------------------------------------------------

/**
 * Confere as invariantes do sistema contra a lista REAL de artigos:
 *   1. na grade geral (home / todos os artigos), dois artigos consecutivos não
 *      repetem o fundo;
 *   2. dentro de uma categoria, dois artigos consecutivos não repetem o fundo —
 *      esta é a regra que a dona pediu, e é o que impede a grade de parecer
 *      repetida;
 *   3. dentro de uma categoria, nenhum motivo se repete;
 *   4. dentro de uma categoria, nenhum fundo aparece mais vezes que o
 *      necessário (teto = ceil(artigos/3)). Esta é a regra que faltava e que
 *      deixou passar TRÊS "ORGANIZAÇÃO" creme: como a palavra gigante do site é
 *      a categoria, (categoria + fundo) é o que o olho lê como "card repetido",
 *      e as regras 1 e 2 só olham vizinhos — não a contagem.
 *
 * @param {{ slug: string, category: string, pubDate: string|Date }[]} posts
 * @returns {{ rows: object[], problems: string[] }}
 */
export function auditCovers(posts) {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.pubDate) - new Date(a.pubDate),
  );
  const rows = sorted.map((p) => ({
    slug: p.slug,
    category: p.category,
    theme: themeIdFor(p.slug),
    motif: motifNameFor(p.slug, p.category),
  }));

  const problems = [];
  const fix = "ajuste THEME_BY_SLUG em src/lib/cover-art.mjs";

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].theme === rows[i - 1].theme) {
      problems.push(
        `[fundo/grade] "${rows[i - 1].slug}" e "${rows[i].slug}" são vizinhos ` +
          `na listagem e os dois estão em ${rows[i].theme} — ${fix}.`,
      );
    }
  }

  const byCategory = new Map();
  for (const r of rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r);
  }

  for (const [category, list] of byCategory) {
    for (let i = 1; i < list.length; i++) {
      if (list[i].theme === list[i - 1].theme) {
        problems.push(
          `[fundo/categoria] ${category}: "${list[i - 1].slug}" e ` +
            `"${list[i].slug}" são consecutivos e os dois estão em ` +
            `${list[i].theme} — ${fix}.`,
        );
      }
    }
    const seen = new Map();
    for (const r of list) {
      if (seen.has(r.motif)) {
        problems.push(
          `[motivo] ${category}: "${seen.get(r.motif)}" e "${r.slug}" ` +
            `repetem o motivo "${r.motif}" — troque um em MOTIF_BY_SLUG.`,
        );
      }
      seen.set(r.motif, r.slug);
    }

    // Concentração de fundo na categoria. Com a palavra gigante sendo a
    // categoria, (categoria + fundo) É a cara do card: passar do teto significa
    // três ou mais capas praticamente idênticas na grade.
    const cap = Math.ceil(list.length / 3);
    const count = new Map();
    for (const r of list) count.set(r.theme, (count.get(r.theme) || 0) + 1);
    for (const [theme, n] of count) {
      if (n > cap) {
        const quais = list
          .filter((r) => r.theme === theme)
          .map((r) => `"${r.slug}"`)
          .join(", ");
        problems.push(
          `[fundo/concentração] ${category}: ${n} artigos em ${theme} ` +
            `(teto ${cap} para ${list.length} artigos) — ${quais} viram o MESMO ` +
            `card na grade, porque a palavra gigante é a categoria. ${fix}.`,
        );
      }
    }
  }

  return { rows, problems };
}
