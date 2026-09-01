/**
 * MOTIVOS DAS CAPAS — FONTE ÚNICA DE VERDADE
 *
 * Este arquivo é JavaScript puro (.mjs) de propósito: ele é importado tanto
 * pelo Astro (src/components/Cover.astro, via TypeScript) quanto pelo Node
 * puro do gerador de cards de compartilhamento (scripts/og.mjs). Antes existiam
 * duas cópias das mesmas formas, e elas iam divergir na primeira mudança.
 *
 * SISTEMA DE COORDENADAS
 * Todo motivo é desenhado numa caixa quadrada de 620x620 com a origem no canto
 * superior esquerdo (0,0) e o centro em (310,310). Cada consumidor posiciona,
 * escala, espelha e rotaciona essa caixa como precisar:
 *   - Cover.astro   → caixa escalada dentro do viewBox 1200x675, sangrando por uma borda;
 *   - scripts/og.mjs → caixa de 620px sangrando pela direita do card 1200x630.
 * A caixa é uma moldura, não um recorte: o motivo pode ultrapassá-la de leve
 * (sangria intencional). Nenhum consumidor aplica clip.
 *
 * ZONA SEGURA — x entre 120 e 500 (y é livre, 0..620)
 * Os dois consumidores cortam a caixa em bordas diferentes, e o espelhamento por
 * slug troca o lado do corte. Interseção de tudo: só a faixa x 120..500 aparece
 * inteira em toda combinação. O que carrega o SENTIDO do motivo (o círculo menor
 * do par desigual, a sobreposição das duas contas, o topo da escada) fica dentro
 * dessa faixa. Só forma decorativa e simétrica (auréola, anel externo) sangra —
 * aí o corte parece intencional em vez de imagem quebrada.
 *
 * ATENÇÃO: a zona segura vale para a caixa SEM GIRO. Um giro de 8° em volta do
 * centro joga um canto da caixa até ~40 unidades para fora — foi assim que os
 * três blocos do 50/30/20 e a grade da planilha apareciam decepados na home.
 * Por isso a rotação hoje só se aplica a motivo de FALLBACK (ver `coverArt`),
 * onde ela existe para desempatar dois artigos que caíram na mesma forma; nesse
 * caso a forma pode ser cortada sem prejuízo, porque o que importa ali é a
 * distinção, não a metáfora.
 *
 * REGRAS DE ESTILO (o que faz os 11 motivos parecerem da mesma família)
 *   1. Uma cor só — a `fg` da categoria. A segunda forma pode variar opacidade
 *      entre 0.35 e 0.45. Nada de terceira cor, gradiente, sombra ou animação.
 *   2. No máximo 4 primitivas por motivo; traço nunca abaixo de 26.
 *   3. O desenho ocupa ~60-70% da altura da caixa (≈ 370-435 unidades).
 *   4. Nenhum texto dentro do motivo — a marca-d'água tipográfica já é o texto.
 *   5. Tem que ser reconhecível num card de ~380px de largura. Se só funciona
 *      grande, simplifique em vez de detalhar.
 *
 * COMO ADICIONAR UM ARTIGO
 * Basta escrever o artigo: sem entrada em MOTIF_BY_SLUG ele cai no motivo da
 * categoria (MOTIF_BY_CATEGORY) e, se nem a categoria for conhecida, no
 * DEFAULT_MOTIF. Nunca quebra o build nem fica sem capa. Para dar um motivo
 * próprio a ele, desenhe a função aqui e registre o slug no mapa.
 */

/** Lado da caixa de desenho. Origem no canto superior esquerdo. */
export const MOTIF_BOX = 620;

/**
 * Cada motivo é uma função (fg) => string com o SVG interno (sem <svg>).
 * O nome da chave é a metáfora, não a categoria.
 *
 * @type {Record<string, (fg: string) => string>}
 */
export const MOTIFS = {
  /** Dois anéis do casal; a lente comum — o que se divide — fica no centro. */
  "split-rings": (fg) => `
    <circle cx="235" cy="315" r="150" fill="none" stroke="${fg}" stroke-width="38" />
    <circle cx="385" cy="315" r="150" fill="none" stroke="${fg}" stroke-width="38" />
    <path d="M 310 185 A 150 150 0 0 1 310 445 A 150 150 0 0 1 310 185 Z" fill="${fg}" opacity="0.35" />`,

  /** Proporcional à renda: dois círculos de tamanhos MUITO diferentes — a desigualdade é o tema. */
  "unequal-circles": (fg) => `
    <circle cx="258" cy="250" r="150" fill="${fg}" />
    <circle cx="408" cy="430" r="88" fill="${fg}" opacity="0.42" />`,

  /** Morar junto: a casa inteira, dividida ao meio. Só as duas águas do telhado
   *  (sem parede) lia como triângulo/seta — a silhueta fechada é o que faz virar
   *  casa num card pequeno. */
  "split-house": (fg) => `
    <path d="M 310 302 H 468 V 478 H 310 Z" fill="${fg}" opacity="0.35" />
    <path d="M 150 302 L 310 160 L 470 302 V 480 H 150 Z" fill="none" stroke="${fg}" stroke-width="40" stroke-linejoin="round" />
    <path d="M 310 302 V 480" fill="none" stroke="${fg}" stroke-width="34" stroke-opacity="0.55" />`,

  /** 50/30/20: três blocos empilhados nas proporções reais do orçamento. */
  "three-buckets": (fg) => `
    <rect x="140" y="108" width="340" height="190" rx="18" fill="${fg}" />
    <rect x="140" y="316" width="340" height="114" rx="18" fill="${fg}" opacity="0.45" />
    <rect x="140" y="448" width="340" height="76" rx="18" fill="${fg}" opacity="0.35" />`,

  /** Conta conjunta: as duas contas de cima desaguando na conta comum de baixo.
   *  Antes eram dois retângulos sobrepostos — no card pequeno os contornos se
   *  fundiam num borrão só; empilhar separa as três partes sem ambiguidade. */
  "joint-account": (fg) => `
    <rect x="132" y="120" width="160" height="112" rx="28" fill="${fg}" opacity="0.42" />
    <rect x="328" y="120" width="160" height="112" rx="28" fill="${fg}" opacity="0.42" />
    <path d="M 212 262 L 296 340 M 408 262 L 324 340" fill="none" stroke="${fg}" stroke-width="26" stroke-linecap="round" stroke-opacity="0.42" />
    <rect x="132" y="360" width="356" height="160" rx="38" fill="${fg}" />`,

  /** Boas-vindas: meio sol subindo no horizonte, com raios — um começo.
   *  A cúpula é meia-circunferência exata (corda = 2r): mais que isso vira iglu.
   *  Os RAIOS é que fazem virar sol; sem eles, meia-lua sobre barra larga lê
   *  como cloche de restaurante (foi o que aconteceu nas duas primeiras versões,
   *  com auréola concêntrica e depois com linhas de reflexo). */
  sunrise: (fg) => `
    <path d="M 120 440 A 190 190 0 0 1 500 440 Z" fill="${fg}" />
    <path d="M -30 440 H 650" fill="none" stroke="${fg}" stroke-width="26" stroke-linecap="round" stroke-opacity="0.6" />
    <path d="M 310 215 V 168 M 198 245 L 175 206 M 422 245 L 445 206" fill="none" stroke="${fg}" stroke-width="24" stroke-linecap="round" stroke-opacity="0.42" />`,

  /** Planilha: a grade 3x3 dentro da moldura, com uma célula já preenchida.
   *  Com 2x2 de quadrados soltos (versão anterior) lia como grade de ícones de
   *  app, não como planilha — a moldura fechada e as linhas internas é que dão
   *  o sentido de tabela. */
  "spreadsheet-grid": (fg) => `
    <rect x="253" y="361" width="114" height="113" fill="${fg}" opacity="0.9" />
    <rect x="140" y="134" width="340" height="340" rx="36" fill="none" stroke="${fg}" stroke-width="30" />
    <path d="M 140 247 H 480 M 140 361 H 480 M 253 134 V 474 M 367 134 V 474" fill="none" stroke="${fg}" stroke-width="22" stroke-opacity="0.45" />`,

  /** Comparativo de apps: barras de alturas diferentes, uma na frente. */
  "app-bars": (fg) => `
    <rect x="120" y="340" width="74" height="170" rx="18" fill="${fg}" opacity="0.4" />
    <rect x="222" y="220" width="74" height="290" rx="18" fill="${fg}" opacity="0.4" />
    <rect x="324" y="110" width="74" height="400" rx="18" fill="${fg}" />
    <rect x="426" y="280" width="74" height="230" rx="18" fill="${fg}" opacity="0.4" />`,

  /** Brigas por dinheiro: dois blocos que colidem e racham em ziguezague.
   *  A fresta entre eles é o assunto — encostados demais viravam um borrão só. */
  clash: (fg) => `
    <path d="M 120 140 H 292 L 240 250 L 306 310 L 232 400 L 292 490 H 120 Z" fill="${fg}" />
    <path d="M 500 140 H 364 L 416 250 L 350 310 L 424 400 L 364 490 H 500 Z" fill="${fg}" opacity="0.4" />`,

  /** Conversa sobre dinheiro: dois balões em diálogo, um respondendo o outro. */
  bubbles: (fg) => `
    <path d="M 164 130 H 336 a 44 44 0 0 1 44 44 V 251 a 44 44 0 0 1 -44 44 H 230 L 176 335 V 295 H 164 a 44 44 0 0 1 -44 -44 V 174 a 44 44 0 0 1 44 -44 Z" fill="${fg}" />
    <path d="M 294 360 H 456 a 44 44 0 0 1 44 44 V 471 a 44 44 0 0 1 -44 44 H 440 V 555 L 396 515 H 294 a 44 44 0 0 1 -44 -44 V 404 a 44 44 0 0 1 44 -44 Z" fill="${fg}" opacity="0.42" />`,

  /** Juntar dinheiro: a escada subindo aporte a aporte até a meta lá em cima.
   *  Degraus grandes e poucos: com cinco degraus finos vira rabisco no card. */
  stairs: (fg) => `
    <path d="M 128 512 H 246 V 406 H 364 V 300 H 452 V 212" fill="none" stroke="${fg}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="452" cy="146" r="40" fill="${fg}" opacity="0.42" />`,

  /** Fallback de organização: a pizza do orçamento com uma fatia puxada. */
  "pie-slice": (fg) => `
    <path d="M 310 330 L 310 155 A 175 175 0 1 1 135 330 Z" fill="${fg}" />
    <path d="M 280 300 L 280 125 A 175 175 0 0 1 455 300 Z" fill="${fg}" opacity="0.45" />`,

  /** Fallback de metas: o alvo concêntrico que o casal mira. */
  target: (fg) => `
    <circle cx="310" cy="315" r="175" fill="none" stroke="${fg}" stroke-width="34" opacity="0.4" />
    <circle cx="310" cy="315" r="108" fill="none" stroke="${fg}" stroke-width="34" opacity="0.7" />
    <circle cx="310" cy="315" r="44" fill="${fg}" />`,
};

/**
 * Um motivo por artigo: a metáfora do assunto daquele texto, não enfeite.
 * @type {Record<string, keyof typeof MOTIFS>}
 */
export const MOTIF_BY_SLUG = {
  // dividir-contas
  "como-dividir-contas-casal": "split-rings",
  "dividir-contas-proporcional-ao-salario": "unequal-circles",
  "morar-junto-dividir-despesas": "split-house",
  // organizacao
  "regra-50-30-20-casal": "three-buckets",
  "conta-conjunta-vale-a-pena": "joint-account",
  "bem-vindos-ao-blog-do-paca": "sunrise",
  // ferramentas
  "planilha-gastos-casal": "spreadsheet-grid",
  "melhor-app-financas-casal": "app-bars",
  // conversas-sobre-dinheiro
  "brigas-por-dinheiro-relacionamento": "clash",
  "como-falar-de-dinheiro-relacionamento": "bubbles",
  // metas-e-sonhos
  "como-juntar-dinheiro-casal": "stairs",
};

/**
 * Rede de segurança para artigo novo ainda não registrado acima.
 * @type {Record<string, keyof typeof MOTIFS>}
 */
export const MOTIF_BY_CATEGORY = {
  "dividir-contas": "split-rings",
  organizacao: "pie-slice",
  "conversas-sobre-dinheiro": "bubbles",
  "metas-e-sonhos": "target",
  ferramentas: "spreadsheet-grid",
};

/** Última rede: nem slug nem categoria conhecidos (nunca fica sem capa). */
export const DEFAULT_MOTIF = "split-rings";

/**
 * Corpo da marca-d'água proporcional ao tamanho da palavra. Num corpo fixo,
 * "ferramentas" (11 letras) fica quase o dobro de "sonhar" (6): atravessava a
 * capa inteira e ia parar embaixo do motivo, enquanto as curtas mal apareciam.
 * A conta iguala a LARGURA aparente das cinco palavras, não o corpo da letra.
 *
 * @param {string} word palavra da categoria
 * @param {number} base corpo usado pela palavra de referência (9 letras)
 * @returns {number} corpo em unidades do viewBox do consumidor
 */
export function watermarkSize(word, base) {
  const size = (base * 9) / Math.max(word.length, 6);
  return Math.round(Math.min(size, base * 1.08));
}

/**
 * Motivos com sentido de leitura: espelhá-los inverte a mensagem (escada subindo
 * vira escada descendo). A variação por slug continua valendo para eles — muda a
 * ancoragem e a rotação —, só o desenho é que não vira do avesso.
 * @type {Set<string>}
 */
export const DIRECTIONAL_MOTIFS = new Set(["stairs"]);

/**
 * Resolve o nome do motivo: slug → categoria → default.
 * @param {string} slug
 * @param {string} category
 * @returns {keyof typeof MOTIFS}
 */
export function motifNameFor(slug, category) {
  return (
    MOTIF_BY_SLUG[slug] || MOTIF_BY_CATEGORY[category] || DEFAULT_MOTIF
  );
}

/**
 * SVG interno do motivo do artigo, já na cor da categoria.
 * @param {string} slug
 * @param {string} category
 * @param {string} fg cor de frente da paleta da categoria
 * @returns {string}
 */
export function motifFor(slug, category, fg) {
  const draw = MOTIFS[motifNameFor(slug, category)] || MOTIFS[DEFAULT_MOTIF];
  return draw(fg);
}

/**
 * Variação determinística por slug — dois artigos que caiam no MESMO motivo de
 * fallback ainda saem diferentes (espelho + rotação), e a capa de um artigo
 * nunca muda entre builds.
 *
 * O embaralhamento final (finalizador do murmur3) não é enfeite: com o hash
 * `*31` cru, os bits BAIXOS quase não mudam entre slugs parecidos, e era isso
 * que ele lia — 8 dos 11 artigos caíam no mesmo layout, e os dois de
 * `ferramentas` (que aparecem lado a lado na home) ficavam com motivo do mesmo
 * lado e marca-d'água no mesmo canto. Espalhar os bits antes de fatiar dá a
 * variedade que a função sempre prometeu.
 *
 * @param {string} slug
 * @returns {{ mirrored: boolean, rotation: number, watermarkTop: boolean }}
 */
export function coverVariant(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return {
    /** Motivo ancorado à direita (padrão) ou espelhado para a esquerda. */
    mirrored: h % 2 === 1,
    /** Rotação leve do grupo do motivo, em graus. */
    rotation: [-8, 0, 8][h % 3],
    /** Marca-d'água na base à esquerda (padrão) ou na faixa de cima. */
    watermarkTop: (h >> 2) % 2 === 1,
  };
}

/**
 * Tudo o que um consumidor precisa para desenhar a capa de um artigo: o SVG do
 * motivo já na cor certa + a variação determinística resolvida. Existe para que
 * a regra "motivo direcional não espelha" viva num lugar só.
 *
 * @param {string} slug
 * @param {string} category
 * @param {string} fg cor de frente da paleta da categoria
 * @returns {{ svg: string, name: string, mirrored: boolean, flip: boolean, rotation: number, watermarkTop: boolean }}
 */
export function coverArt(slug, category, fg) {
  const name = motifNameFor(slug, category);
  const variant = coverVariant(slug);
  const draw = MOTIFS[name] || MOTIFS[DEFAULT_MOTIF];
  // Artigo com motivo próprio já é único pela forma: girar só o desalinhava e
  // empurrava a metáfora para fora da zona segura. O giro fica reservado ao
  // fallback, onde dois artigos podem repetir a mesma forma.
  const ownMotif = Boolean(MOTIF_BY_SLUG[slug]);
  return {
    svg: draw(fg),
    name,
    /** Layout: motivo (e marca-d'água) ancorados no lado invertido. */
    mirrored: variant.mirrored,
    /** Desenho: virar o motivo do avesso? Nunca para motivo direcional. */
    flip: variant.mirrored && !DIRECTIONAL_MOTIFS.has(name),
    rotation: ownMotif ? 0 : variant.rotation,
    watermarkTop: variant.watermarkTop,
  };
}
