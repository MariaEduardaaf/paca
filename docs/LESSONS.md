# Lições deste repositório

Erros cuja causa não era óbvia, e que custariam a mesma caçada de novo. Lições que valem em qualquer
projeto moram em `~/.claude/licoes.md` — aqui só o que é específico do Paca.

## Blog (Astro)

**Dois artigos com a mesma `pubDate` quebram o sistema de capas**
`sintoma:` `npm run capas` sai com código 1 acusando `[fundo/grade] "X" e "Y" são vizinhos na listagem
e os dois estão em <fundo>`, logo depois de você ajustar datas de publicação. Trocar o fundo de um
resolve ali e quebra outro dois artigos adiante.
`causa:` `auditCovers()` ordena por `pubDate` decrescente. Com datas **empatadas** a ordem vira a de
entrada — e a de entrada é diferente no script (`readdir` alfabético) e no `getCollection` do Astro.
Não existe "a" ordem. Busca exaustiva sobre todas as atribuições de fundo e motivo dos slugs livres:
**zero** soluções válidas nas duas ordens possíveis do empate. Com datas distintas, a atribuição que
já estava no arquivo passou sem trocar nada.
`fix:` **um artigo por dia, nunca dois na mesma data** — o que por sorte coincide com a regra de
cadência do `CLAUDE.md`. Ao registrar artigo novo, resolva fundo e motivo por busca de mínima mudança
validada em **todos** os estados por que a grade vai passar (hoje e cada publicação já agendada), não
só no estado final.

**Link interno para artigo ainda não publicado vira 404 no ar, sem ninguém ter mexido nele**
`sintoma:` produção tem links internos quebrados e o git não mostra nenhuma alteração recente neles.
Medido em 15/09/2026: três de uma vez, durante a análise do AdSense.
`causa:` a malha interna é escrita quando o artigo é **redigido**, mas o artigo só passa a existir
quando `draft` vira `false`. O commit que cria o rascunho costuma trazer junto os links de **entrada**,
que moram em artigos vizinhos **já publicados** — e esses vão ao ar no push seguinte, apontando para
uma página que ainda não existe.
`fix:` o rascunho e os links de entrada dele são o **mesmo commit**, e esse commit não sobe antes do
dia da publicação (segure localmente e empurre por sha: `git push origin <sha>:<branch>`).
`Diagnóstico 1º:` depois de todo build,
`grep -rho 'href="/blog/[a-z0-9-]*"' apps/blog/dist --include="*.html" | sort -u` e conferir cada
destino contra `apps/blog/dist/blog/<slug>/`.

**Artigo novo sem entrada em `cover-art.mjs` não fica sem capa — fica com a capa de outro**
`sintoma:` a grade da home mostra dois cards praticamente idênticos, e nada falhou no build.
`causa:` sem entrada em `MOTIF_BY_SLUG`, o slug cai no motivo da **categoria**. Na capa do site a
palavra gigante já é a categoria, então (categoria + fundo + motivo) iguais = mesmo card. Aconteceu
com `regime-de-bens-antes-de-casar`, que caía em `stack-two` — já usado pelo `conta-conjunta-nubank`,
da mesma categoria.
`fix:` todo artigo novo entra em `THEME_BY_SLUG` **e** `MOTIF_BY_SLUG` antes de publicar. Quem pega é
o `auditCovers()` do `npm run capas`/`npm run og` — que só roda sobre artigos **não-draft**, então o
erro só aparece no dia em que você publica, e não no dia em que escreve.

**403 de fonte citada não é link morto**
`sintoma:` a conferência de links acusa `403` em fonte boa (Taylor & Francis, STF, CNJ) e a tentação é
trocar a fonte.
`causa:` esses sites bloqueiam cliente automatizado; navegador de verdade abre normalmente.
`fix:` antes de mexer, confirme por outro caminho — para DOI, `api.crossref.org/works/<doi>` devolve
título, revista e ano sem passar pelo bloqueio. Só troque a fonte se ela realmente não existir.
