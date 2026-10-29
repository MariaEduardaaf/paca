/**
 * Quem assina os artigos.
 *
 * ── POR QUE ISTO EXISTE, E POR QUE É UM REGISTRO E NÃO TEXTO SOLTO ──────────
 * Assinatura de artigo não é enfeite: as diretrizes de avaliação de qualidade
 * do Google pedem byline onde o leitor espera E link para uma página com o
 * histórico de quem escreve. Nome solto no topo do artigo não cumpre a segunda
 * metade — por isso cada autora aqui tem `url`, e o JSON-LD do artigo aponta
 * para lá com `"@type": "Person"`.
 *
 * ── ⚠️ A REGRA DURA DESTE ARQUIVO ──────────────────────────────────────────
 * **Só entra aqui pessoa que existe e que de fato assina ou avalia o que
 * sai com o nome dela.** As mesmas diretrizes listam, com todas as letras, "conteúdo gerado
 * por IA com perfis de autor inventados (imagens geradas ou descrições
 * enganosas de quem cria)" como marca de conteúdo de pior qualidade — e em
 * finanças, que é assunto sensível, isso pesa mais do que em qualquer outro
 * tema. Persona fictícia com credencial fictícia é o erro caro; nome real de
 * quem assina e de quem avalia é o oposto disso.
 *
 * **E nenhuma credencial entra aqui sem ser verdade.** "Escreve sobre finanças
 * do casal" só é fato para quem escreve. "Planejadora financeira certificada" só com certificação.
 */

export type Autora = {
  /** Como o nome aparece na assinatura. */
  nome: string;
  /** Página com o histórico — o link que a diretriz pede. `null` = sem página própria. */
  url: string | null;
  /** Uma linha, mostrada onde couber. Sempre verdade, nunca credencial inflada. */
  resumo: string;
};

/**
 * A chave é o que vai no frontmatter (`author: "madu"`, `reviewer: "mary"`), não o nome. Assim um
 * erro de digitação no nome não quebra o link da página — e renomear a pessoa
 * não exige tocar em artigo nenhum.
 */
export const AUTORAS: Record<string, Autora> = {
  /**
   * Queda segura para quando a chave não existe. Hoje nenhum artigo a usa:
   * todos assinam `madu`. ⚠️ Não atribua texto a quem não o escreveu.
   */
  equipe: {
    nome: "Equipe Paca Finance",
    url: "/sobre",
    resumo: "Quem constrói o Paca Finance e escreve por aqui.",
  },

  /** Assina os artigos (`author: "madu"`). */
  madu: {
    nome: "Madu Freire",
    url: "/autoras/madu-freire",
    resumo: "Engenheira de software. Criou o Paca Finance e escreve os guias de finanças para casais do blog.",
  },

  /** Não escreve nem edita: lê e avalia antes de publicar (`reviewer: "mary"`). */
  mary: {
    nome: "Mary Kondratieva",
    url: "/autoras/mary-kondratieva",
    resumo: "Lê e avalia os guias do Paca Finance antes de irem ao ar.",
  },
};

/** A autora de um artigo, com queda segura para a equipe quando a chave não existe. */
export function autoraDe(chave: string | undefined): Autora {
  return (chave && AUTORAS[chave]) || AUTORAS.equipe;
}
