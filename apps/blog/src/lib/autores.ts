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
 * **Só entra aqui pessoa que existe e que de fato lê o que sai com o nome
 * dela.** As mesmas diretrizes listam, com todas as letras, "conteúdo gerado
 * por IA com perfis de autor inventados (imagens geradas ou descrições
 * enganosas de quem cria)" como marca de conteúdo de pior qualidade — e em
 * finanças, que é assunto sensível, isso pesa mais do que em qualquer outro
 * tema. Persona fictícia com credencial fictícia é o erro caro; nome real de
 * quem revisa é o oposto disso.
 *
 * **E nenhuma credencial entra aqui sem ser verdade.** "Escreve sobre finanças
 * do casal" é fato. "Planejadora financeira certificada" só com certificação.
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
 * A chave é o que vai no frontmatter (`author: "mary"`), não o nome. Assim um
 * erro de digitação no nome não quebra o link da página — e renomear a pessoa
 * não exige tocar em artigo nenhum.
 */
export const AUTORAS: Record<string, Autora> = {
  /**
   * O padrão, e o que assina os 19 artigos anteriores a setembro de 2026.
   *
   * ⚠️ Eles NÃO foram reatribuídos a ninguém. Reescrever a autoria de texto
   * antigo para um nome que não o escreveu é exatamente o sinal que este
   * arquivo existe para evitar — e seria pior que a assinatura genérica que
   * eles já tinham.
   */
  equipe: {
    nome: "Equipe Paca Finance",
    url: "/sobre",
    resumo: "Quem constrói o Paca Finance e escreve por aqui.",
  },

  mary: {
    nome: "Mary Kondratieva",
    url: "/autoras/mary-kondratieva",
    resumo: "Escreve e edita os guias de finanças para casais do Paca Finance.",
  },
};

/** A autora de um artigo, com queda segura para a equipe quando a chave não existe. */
export function autoraDe(chave: string | undefined): Autora {
  return (chave && AUTORAS[chave]) || AUTORAS.equipe;
}
