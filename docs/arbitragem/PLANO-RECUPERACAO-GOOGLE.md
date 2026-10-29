# Plano de recuperação no Google: blog.pacafinance.com.br

> Escrito em 29/10/2026, a partir do Search Console medido no mesmo dia, do código que está no ar
> (`origin/feat/hardening-and-blog`) e da leitura dos artigos. **Nada foi editado, commitado ou publicado.**
> O que não foi confirmado está marcado com ⚠️.

## 1. Em cinco linhas

1. O blog saiu do Google em 10/10, de uma vez, no fim do Spam Update de setembro. Sem ação manual. O mais provável é um rebaixamento automático do **site inteiro** por parecer conteúdo feito em escala. ⚠️ A causa não é confirmável; o Google não avisa.
2. A auditoria achou as marcas que esse filtro procura: 20 artigos criados em 5 dias, datas no site que fingem uma publicação diária, o mesmo molde repetido, a mesma estatística em 14 artigos, a mesma chamada de venda em 15, e quase nenhuma experiência própria.
3. O plano é **menos páginas e cada uma mais verdadeira**: 2 fusões, 9 URLs fora do índice, uma limpeza de molde em 22 artigos e 9 páginas que só melhoram com informação real da Duda.
4. Nenhum artigo novo no molde atual. Dos 4 da fila, a recomendação é soltar só os 2 que já têm vídeo apontando para eles, e segurar os outros 2.
5. Recuperação, se vier, costuma aparecer só numa atualização futura do Google, em meses. Não há garantia, e mesmo a volta total seria pequena (30 a 60 impressões por dia).

---

## 2. O que aconteceu, e o que não sabemos

| Período | Impressões no Google | Leitura |
|---|---|---|
| até 09/10 | 30 a 60 por dia, posição média ~8 | 370 de 461 impressões numa página só: `conta-conjunta-nubank` |
| de 10/10 em diante | ~0 no site inteiro (só 2 em 17/10) | queda simultânea em todas as páginas, inclusive as indexadas |

**Por que isso aponta para o site e não para um artigo:** página indexada que some de todas as buscas no mesmo dia é sinal de julgamento sobre o site todo. O Spam Update de setembro rodou de 24/09 a 08/10, e a queda começa dois dias depois de ele terminar. O AdSense já tinha reprovado o site por "Conteúdo de baixo valor" em 01/10, que é o mesmo julgamento visto pelo lado da publicidade.

**O que não sabemos:**
- ⚠️ Se foi o Spam Update, um sistema de qualidade geral, ou o fim da "lua de mel" que site novo às vezes tem. Os três pedem o mesmo remédio, então a dúvida não muda o plano.
- ⚠️ Se as páginas ditas "indexadas" ainda aparecem para alguma busca. Teste de 2 minutos para a Duda: buscar no Google o título exato do artigo do Nubank (`Nubank tem conta conjunta? Não. Veja o que usar no lugar`). Se nem assim ele aparecer, o rebaixamento é do site inteiro.
- ⚠️ Quanto tempo leva. O Google diz que, depois de corrigir, os sistemas automáticos levam meses para perceber, e que a mudança costuma aparecer em atualizações futuras.

---

## 3. O que a auditoria achou

### 3.1 As marcas de conteúdo em escala, com números

| Marca | O que medi | Onde |
|---|---|---|
| **Rajada de publicação** | 10 artigos criados em 31/08 num commit só, 7 em 02/09, mais 4 entre 03 e 04/09. São 21 artigos em 5 dias, num site recém-criado | histórico do git |
| **Datas inventadas** | 15 artigos mostram data de publicação **anterior** ao dia em que foram criados (ex.: `como-falar-de-dinheiro` diz 17/08, foi criado em 31/08). As datas espalhadas de 17/08 a 30/08 simulam um artigo por dia que não aconteceu. O Google lê essa data no `datePublished` | frontmatter vs git |
| **Molde repetido, versão 1** | 17 artigos fecham com `## Perguntas frequentes`; 16 abrem com o parágrafo-roteiro "Neste guia, vocês vão ver..." | artigos de agosto e setembro |
| **Molde repetido, versão 2** | os artigos novos trocaram o FAQ por outro fecho fixo: "O combinado para este domingo" (4) e "Uma última coisa" (4) | artigos assinados pela Mary |
| **A mesma estatística em todo lugar** | "53% dos brasileiros apontam o dinheiro como o principal motivo de briga" (Serasa) aparece em **14 artigos**, quase sempre no primeiro ou segundo parágrafo | 14 de 27 |
| **A mesma chamada de venda** | "criar a conta do casal no plano grátis" em **15 artigos**, mais o aviso "se vocês já têm uma planilha que funciona..." em 13 | 15 de 27 |
| **Travessão** | 22 artigos têm de 19 a 44 travessões cada. É marca forte de texto de IA em português. Os 5 mais novos têm zero | 22 de 27 |
| **Tique de "honestidade"** | "honesto/honesta" 39 vezes em 23 artigos ("sejamos honestos", "contras honestos", "a ressalva honesta") | 23 de 27 |
| **Casal fictício recorrente** | "Ana e Bruno" (49 menções) e "Carla e Diego" como exemplo em 3 artigos | proporcional, planilha, 50/30/20 |
| **A mesma explicação repetida** | a fórmula da divisão proporcional é explicada do zero em pelo menos 7 páginas (como-dividir, proporcional, nubank, 50/30/20, morar-junto, namorados, quando-um-ganha-mais) e na calculadora | ver seção 5 |
| **Experiência própria** | nenhum artigo tem um caso vivido por quem escreve. Os exemplos são hipotéticos ("Um exemplo hipotético, para dar escala") | 27 de 27 |

**O que está bom e deve ser preservado:** os números são de fonte aberta e as fontes, em geral, são boas (Planalto, DIEESE, Pew, Serasa, NBER). Os artigos de outubro (`quando-um-ganha-mais`, `namorados`, `dinheiro-pessoal`) têm ângulo próprio e dizem o tamanho real de cada dado. As 4 calculadoras são a coisa mais original do site. O guardião de 01/10 não achou cópia entre artigos (pior caso 2,7%). O problema não é plágio nem erro factual: é **cara de produção em série sem nada que só vocês têm**.

### 3.2 Autoria: o ponto de maior risco de confiança

- A página `/autoras/mary-kondratieva` não tem foto, biografia, link externo nem data; só "Copywriter. Escreve e edita os guias". O Google não indexou essa página ("Detectada, mas não indexada").
- O `/sobre` diz que a Mary **escreve e edita** e que o time traz "o que aprendemos construindo o produto e **conversando com casais de verdade**". ⚠️ Não achei registro dessas conversas. Se não aconteceram, a frase é uma afirmação de experiência que não existe.
- O próprio código (`src/lib/autores.ts`) lembra que as diretrizes do Google citam "perfis de autor inventados" como marca de pior qualidade, e mais ainda em finanças.
- **A pergunta que decide:** a Mary Kondratieva é uma pessoa real que faz esse trabalho? Se for um nome que a Duda usa, isso é permitido, desde que a descrição seja verdade para quem está por trás. Se for uma persona sem pessoa real fazendo o que a página diz, ela tem que sair, e os artigos passam a assinar quem de fato responde por eles. Ver pergunta 1 na seção 7(c).
- O fluxo real (rascunho por IA, revisão, leitura final) está declarado no site, e isso é bom. O que não pode é a página dizer que alguém "escreve" se o papel real é aprovar.

### 3.3 Técnico (rápido)

| Item | Estado | Ação |
|---|---|---|
| canonical | certo em todas as páginas | nada |
| noindex | só em `/descadastro` | pôr `noindex` em `/categorias` e nas 5 categorias (ver 7a) |
| sitemap | 44 URLs, com `lastmod`; sem `/descadastro` | tirar categorias e os artigos com noindex |
| robots.txt | libera tudo | nada |
| dados estruturados | `BlogPosting`, `BreadcrumbList`, `FAQPage` nos 17 com FAQ | o `FAQPage` não dá resultado especial para site de finanças desde 2023; sai sozinho quando o FAQ sai |
| autor no JSON-LD | Mary = `Person` com link; "Equipe" = `Organization` com link para `app.pacafinance.com.br`, que é bloqueado no robots | apontar para `/sobre` |
| `datePublished` | 15 artigos com data anterior à criação | corrigir para a data real (ver 7a) |
| `dateModified` | nenhum artigo tem `updatedDate` | usar só quando a mudança for de verdade |
| link interno | `conta-conjunta-nubank`, a única página com tráfego, recebe link de **um** artigo só. `dividir-contas-proporcional` recebe de 20 | levar links ao Nubank de onde faz sentido |
| categorias | 5 páginas de listagem; "Ferramentas" tem 2 artigos | noindex |
| AdSense e Pixel da Meta | carregando no ar | nada por ora; não pedir revisão agora |

---

## 4. Inventário dos 27 artigos no ar

"Índice" vem do Search Console de 29/10. ⚠️ "Indexado" quer dizer "não aparece nas listas de não indexados"; os 3 mais novos podem ainda nem ter sido vistos. `bem-vindos` está fora (é rascunho e redireciona para `/sobre`).

| Artigo | Palavras | Data no site | Criado de fato | Intenção de busca | Links recebe / envia | Índice |
|---|---|---|---|---|---|---|
| conta-conjunta-nubank | 2.104 | 28/08 | 02/09 | "nubank tem conta conjunta" | 1 / 4 | indexado, **único com tráfego** |
| conta-conjunta-vale-a-pena | 2.559 | 21/08 | 31/08 | prós e contras da conta conjunta | 9 / 9 | indexado |
| como-dividir-contas-casal | 2.657 | 23/08 | 31/08 | "como dividir contas casal" (amplo) | 12 / 8 | detectada, não indexada |
| dividir-contas-proporcional-ao-salario | 2.395 | 27/08 | 31/08 | divisão proporcional | 20 / 5 | indexado |
| morar-junto-dividir-despesas | 2.549 | 18/08 | 31/08 | despesas de quem vai morar junto | 5 / 7 | indexado |
| namorados-dividem-a-conta | 1.227 | 16/10 | 15/10 | dividir no namoro | 3 / 4 | indexado |
| quando-um-ganha-mais-que-o-outro | 2.583 | 28/10 | 16/10 | poder e padrão de vida com rendas diferentes | 3 / 5 | ⚠️ novo, não confirmado |
| regra-50-30-20-casal | 2.364 | 19/08 | 31/08 | regra 50/30/20 | 5 / 4 | **rastreada, não indexada** |
| planilha-gastos-casal | 2.554 | 24/08 | 31/08 | planilha pronta (quer arquivo) | 4 / 5 | indexado |
| melhor-app-financas-casal | 2.159 | 25/08 | 31/08 | comparativo de apps | 4 / 4 | indexado |
| brigas-por-dinheiro-relacionamento | 2.934 | 22/08 | 31/08 | brigas por dinheiro | 11 / 8 | **rastreada, não indexada** |
| como-falar-de-dinheiro-relacionamento | 2.547 | 17/08 | 31/08 | como conversar sobre dinheiro | 13 / 6 | indexado |
| divida-escondida-do-parceiro | 2.108 | 03/09 | 03/09 | descobri dívida do parceiro | 5 / 7 | indexado |
| dinheiro-pessoal-no-casal | 2.014 | 14/10 | 14/10 | dinheiro só seu no casal | 5 / 4 | indexado |
| quando-um-sustenta-o-outro | 2.294 | 15/09 | 04/09 | renda única por escolha | 5 / 8 | indexado |
| um-dos-dois-desempregado-financas-casal | 2.611 | 29/08 | 02/09 | desemprego de um | 4 / 5 | indexado |
| ajudar-os-pais-financeiramente-casal | 2.067 | 04/09 | 04/09 | ajudar a família | 2 / 6 | indexado |
| cartao-de-credito-casal | 2.682 | 31/08 | 02/09 | adicional ou cartões separados | 5 / 6 | detectada, não indexada |
| casal-endividado-como-sair-das-dividas | 2.994 | 02/09 | 02/09 | sair das dívidas a dois | 7 / 5 | detectada, não indexada |
| como-juntar-dinheiro-casal | 2.648 | 20/08 | 31/08 | juntar para uma meta | 7 / 11 | indexado |
| reserva-de-emergencia-casal | 2.703 | 30/08 | 02/09 | reserva de emergência | 10 / 7 | indexado |
| comprar-casa-juntos-financiamento | 2.711 | 01/09 | 02/09 | financiamento a dois | 4 / 4 | indexado |
| quanto-custa-casar | 2.892 | 03/09 | 02/09 | custo do casamento | 2 / 6 | detectada, não indexada |
| regime-de-bens-antes-de-casar | 2.885 | 01/10 | 15/09 | regime de bens (jurídico) | 2 / 6 | detectada, não indexada |
| renda-extra-no-casal | 3.123 | 01/10 | 04/09 | segundo trabalho, MEI, imposto | 2 / 5 | detectada, não indexada |
| 13-salario-casal | 1.329 | 21/10 | 15/10 | o que fazer com o 13º | 3 / 4 | ⚠️ provável |
| viagem-a-dois-dividir-gastos | 1.254 | 23/10 | 15/10 | dividir gastos de viagem | 3 / 3 | ⚠️ provável |

Média: ~2.400 palavras, quase todos com 6 a 9 seções. Os 3 únicos abaixo de 1.400 palavras são de outubro.

---

## 5. Onde um artigo come o outro

| Grupo | Páginas | O problema | Decisão |
|---|---|---|---|
| **Dividir as contas** | como-dividir, proporcional, calculadora de divisão, morar-junto, namorados, quando-um-ganha-mais, 50/30/20 | a fórmula proporcional é explicada do zero em 7 lugares; `como-dividir` (o termo amplo) nunca foi nem visitado pelo Google, enquanto `proporcional` está indexado e recebe 20 links | **fundir** `como-dividir` em `proporcional`; os outros param de reexplicar a fórmula e passam a linkar |
| **Brigar x conversar** | brigas, como-falar, divida-escondida | `brigas` foi lida e recusada pelo Google; o mesmo trio de números da Serasa abre os dois | **fundir** `brigas` em `como-falar` |
| **Conta conjunta** | nubank, vale-a-pena | buscas diferentes, e o Nubank é o único ativo | manter os dois, com link cruzado forte |
| **Uma renda só** | quando-um-sustenta, desempregado, quando-um-ganha-mais | casos diferentes (escolha, perda, diferença) | manter; cada um deixa de repetir o que o outro diz |
| **Dinheiro de cada um** | dinheiro-pessoal, quando-um-ganha-mais, 50/30/20 ("mesada"), conta conjunta ("três potes") | a mesma ideia em 4 lugares | `dinheiro-pessoal` vira a referência; os outros linkam |
| **Meta e reserva** | como-juntar, reserva, calculadoras de meta e reserva | sobreposição baixa | manter |
| **Casamento** | quanto-custa-casar, calculadora do casamento, regime de bens | regime é jurídico, fora do escopo decidido em 01/10 | manter custo; regime sai do índice |

---

## 6. Decisão por URL

**Contagem (47 URLs no ar):** manter 27 · melhorar 9 · fundir 2 · noindex 9 · remover 0.

"Manter" quer dizer: fica, passa só pela limpeza de molde de 7(a). Nada é apagado: `noindex` é reversível e a página continua no ar para quem chega por link.

| URL | Decisão | O quê, exatamente |
|---|---|---|
| /blog/conta-conjunta-nubank | manter | **Não mexer em URL nem título.** Só limpeza, data de conferência do Espaço Família e mais links internos apontando para ele |
| /blog/conta-conjunta-vale-a-pena | manter | limpeza |
| /blog/divida-escondida-do-parceiro | manter | limpeza (31 travessões) |
| /blog/dinheiro-pessoal-no-casal | manter | trocar o fecho fixo; vira a referência de "valor livre" |
| /blog/quando-um-ganha-mais-que-o-outro | manter | trocar o fecho fixo |
| /blog/quando-um-sustenta-o-outro | manter | limpeza; trocar "Uma última coisa" |
| /blog/ajudar-os-pais-financeiramente-casal | manter | limpeza; trocar "Uma última coisa" |
| /blog/um-dos-dois-desempregado-financas-casal | manter | limpeza; tirar FAQ |
| /blog/como-juntar-dinheiro-casal | manter | limpeza; tirar FAQ |
| /blog/reserva-de-emergencia-casal | manter | limpeza; tirar FAQ |
| /blog/comprar-casa-juntos-financiamento | manter | limpeza; tirar FAQ |
| /blog/morar-junto-dividir-despesas | manter | limpeza; trocar a reexplicação da fórmula por link |
| /blog/namorados-dividem-a-conta | manter | trocar o fecho fixo |
| /blog/13-salario-casal | manter | revisar datas em novembro (é sazonal) |
| /blog/viagem-a-dois-dividir-gastos | manter | nada além do fecho |
| /blog/dividir-contas-proporcional-ao-salario | **melhorar** | recebe a fusão: vira "a" página de como dividir (50/50 x proporcional), com a calculadora no topo; trocar Ana e Bruno pelo caso real da Duda, se ela topar (pergunta 2) |
| /blog/como-falar-de-dinheiro-relacionamento | **melhorar** | recebe a fusão de `brigas`: o roteiro de conversa + o que fazer quando já virou briga |
| /blog/planilha-gastos-casal | **melhorar** | o leitor quer um arquivo e o texto diz "aqui não tem arquivo para baixar". Criar uma planilha real no Google Sheets com link "fazer uma cópia", testada pela Duda (pergunta 5) |
| /blog/melhor-app-financas-casal | **melhorar** | hoje diz "Comparamos" sem prova de teste, e 4 de 7 preços são "ver site oficial". Teste de verdade com prints e data (pergunta 4). **Se não der para testar: noindex** |
| /blog/cartao-de-credito-casal | **melhorar** | limpeza + experiência real com adicional, se houver (pergunta 8); conferir regras citadas |
| /blog/casal-endividado-como-sair-das-dividas | **melhorar** | cortar o molde "Passo 1 a 5", conferir programas e datas de renegociação citados (envelhecem rápido) |
| /blog/quanto-custa-casar | **melhorar** | a tabela de fontes é boa; somar custo real vivido, se existir (pergunta 6); ligar à calculadora do casamento |
| /blog/como-dividir-contas-casal | **fundir** | 301 para `/blog/dividir-contas-proporcional-ao-salario`. Nunca foi visitado pelo Google, então não há o que perder. Atualizar os 12 links que apontam para ele |
| /blog/brigas-por-dinheiro-relacionamento | **fundir** | 301 para `/blog/como-falar-de-dinheiro-relacionamento`, levando a seção de gasto escondido e o roteiro. Atualizar os 11 links |
| /blog/regra-50-30-20-casal | **noindex** | o Google leu e recusou; é o assunto mais batido do tema, sem nada próprio. Volta ao índice só se ganhar o orçamento real de um casal |
| /blog/regime-de-bens-antes-de-casar | **noindex** | tema jurídico, que a própria Duda tirou do escopo em 01/10 porque ninguém do time é da área. Volta só com revisão de advogado com nome na página (pergunta 10) |
| /blog/renda-extra-no-casal | **noindex** | o mais longo do site (3.123 palavras), periférico ao tema do casal, com parte tributária (MEI, imposto) sem revisão profissional |
| /calculadora-divisao-de-contas | manter | é o ativo mais forte; só passa a receber o link do topo do artigo fundido |
| /calculadora-reserva-de-emergencia | manter | |
| /calculadora-custo-do-casamento | manter | |
| /calculadora-meta-a-dois | manter | |
| /calculadoras | manter | |
| /categorias e as 5 categorias (6 URLs) | **noindex** | listagens sem conteúdo próprio; "Ferramentas" tem 2 artigos. O `/blog` já lista tudo, então não se perde caminho |
| /autoras/mary-kondratieva | **melhorar** | depende da pergunta 1: biografia real em primeira pessoa, foto real, link público; ou a página sai e a assinatura muda |
| /sobre | **melhorar** | tirar "conversando com casais de verdade" se não for verdade; dizer quem está por trás com nome (pergunta 9) |
| / e /blog | manter | |
| /contato, /privacidade, /termos | manter | ficar fora do índice é normal para elas; não pesam contra |
| /descadastro | manter | já tem noindex |
| /rss.xml | manter | feed não é para ser indexado |

---

## 7. Plano de ação

### (a) Correções rápidas, técnicas e de molde

Ordem sugerida. Tudo é local e reversível até o push.

| # | Ação | Esforço |
|---|---|---|
| a1 | `noindex` em `/categorias` e nas 5 categorias, e tirar do sitemap (o filtro do sitemap já existe no `astro.config.mjs`) | 30 min |
| a2 | `noindex` nos 3 artigos da tabela e tirar do sitemap. Precisa de um campo `noindex` no frontmatter que o layout respeite (o `BaseLayout` já aceita a prop) | 1 h |
| a3 | Autor "Equipe" no JSON-LD apontando para `/sobre`, não para o app | 10 min |
| a4 | **Decisão da Duda.** O `CLAUDE.md` do projeto já registra as datas espalhadas e decidiu "fica como está, mas não repita". Recomendo rever essa decisão: corrigir as 15 datas para o dia real em que cada artigo foi ao ar, porque data que não aconteceu é exatamente o tipo de sinal que este plano tenta tirar. ⚠️ O ganho no Google não é mensurável; o motivo é ser verdade. Se aprovado: várias vão empatar em 31/08 e 02/09, e o `docs/LESSONS.md` registra que data empatada quebra o sistema de capas, então precisa de um desempate (ex.: por slug) antes | 1 h |
| a5 | Mais links para o Nubank: de `cartao-de-credito-casal`, `morar-junto` e do artigo fundido de dividir contas | 20 min |
| a6 | **Limpeza de molde nos 22 artigos antigos**: tirar os travessões reescrevendo a frase (não trocar por vírgula às cegas), deixar o "53%" só em `como-falar`, tirar a chamada "plano grátis" de onde o app não é o assunto (fica em `melhor-app`, `planilha` e no artigo de dividir contas), tirar os 16 parágrafos "Neste guia, vocês vão ver", cortar o tique "honesto", tirar o FAQ onde ele só repete o texto, e variar os fechos fixos dos artigos novos. Passar o `/guardiao` em cada um | ~25 min por artigo com IA + **~15 min de leitura da Duda por artigo**. Total ~9 h de produção e ~5 h dela |

Ao terminar um artigo de verdade, pôr `updatedDate`. Não pôr `updatedDate` em mudança cosmética.

### (b) Consolidação

| # | Ação | Esforço |
|---|---|---|
| b1 | Fundir `como-dividir-contas-casal` em `dividir-contas-proporcional-ao-salario`: trazer a tabela 50/50 x proporcional e a seção "o que entra na conta"; o método "conta conjunta" vira link para `conta-conjunta-vale-a-pena`. Redirect 301 no `vercel.json` (já existe um igual para o `bem-vindos`). Ajustar título para cobrir os dois termos sem mudar a URL | 3 h |
| b2 | Fundir `brigas-por-dinheiro-relacionamento` em `como-falar-de-dinheiro-relacionamento`, mesmo processo | 3 h |
| b3 | Atualizar os links internos que apontavam para as duas URLs fundidas (23 links) | 1 h |
| b4 | Nos artigos que reexplicam a fórmula proporcional, trocar a explicação por uma frase e o link | 1 h |

Resultado: de 27 artigos no índice para 22 (25 menos 3 com noindex). Menos páginas, nenhuma dizendo a mesma coisa.

**Alternativa ⚠️ para b1:** fazer o contrário (manter a URL ampla `como-dividir-contas-casal` e mandar a `proporcional` para ela). A busca ampla é maior, mas a URL ampla nunca foi indexada e a `proporcional` já é o centro de 20 links. Recomendo b1 como está.

### (c) Melhorias que só a Duda pode dar

É aqui que o site deixa de ser "mais um blog de finanças". Nada aqui é para a IA inventar. Resposta curta, por áudio, serve. **Se a resposta for "não tenho isso", a resposta é válida**: o artigo fica sem o bloco, e nada é escrito como se fosse vivido.

**Perguntas, na ordem de impacto:**

1. **Quem é a Mary Kondratieva?** Pessoa real diferente de você, ou um nome que você usa? Em cada artigo, ela escreve, edita ou só aprova a versão final? Pode ter foto real e um link público (LinkedIn ou Instagram)? Isso decide se a página de autora fica, muda ou sai.
2. **Como vocês dividem as contas em casa, de verdade?** Meio a meio, proporcional, mudou alguma vez e por quê? Percentuais bastam, não precisa de salário.
3. **Você já tentou conta conjunta, Espaço Família ou caixinha a dois no Nubank?** O que aconteceu na prática? (Vai no único artigo que o Google já gostou.)
4. **Você testaria de verdade os apps do comparativo?** Instalar, usar alguns dias, tirar print, anotar o preço com data. Se não, o comparativo sai do índice.
5. **Topa usar por um mês uma planilha que eu monto, com seu parceiro**, para o blog oferecer uma cópia real e testada?
6. **Casou ou está planejando?** Algum custo real que você topa publicar, mesmo que só de um item?
7. **O Paca tem dados de uso que vocês topariam publicar de forma agregada** (ex.: quantos casais usam divisão proporcional)? Tem gente suficiente no app para o número não identificar ninguém? ⚠️ Envolve LGPD e os termos do app.
8. **Vocês usam cartão adicional?** Como foi?
9. **A frase do `/sobre` "conversando com casais de verdade" é verdade?** Com quantos casais, em que contexto? Se não, ela sai.
10. **Você tem contato com um advogado e um contador** que revisariam regime de bens e imposto de renda, com o nome deles na página? Se não, regime de bens fica fora do índice e o imposto de renda fica na gaveta.
11. **Dá para mudar o link dos vídeos agendados** para 04/11 e 11/11, caso você prefira segurar esses dois artigos?

Esforço: 1 h de conversa com a Duda, depois 1 a 2 h por artigo para encaixar o que ela der, sempre com a leitura final dela.

### (d) O que NÃO fazer

- **Não publicar artigo novo no molde atual** depois dos 2 da fila. Mais volume no mesmo formato reforça exatamente o sinal que derrubou o site.
- **Não inventar experiência.** Nada de "a gente testou", "conversamos com casais", foto gerada, biografia escrita por outra pessoa. É a pior marca de qualidade que o Google lista.
- **Não mudar URL, título ou data do artigo do Nubank** além do descrito. É o único que já provou valor.
- **Não pôr `updatedDate` falso** para parecer atualizado.
- **Não apagar artigos em massa nem republicar em URLs novas.** Fusão com 301 e noindex resolvem sem perder nada.
- **Não pedir indexação manual URL por URL.** Não muda o julgamento de qualidade.
- **Não pedir revisão do AdSense agora.** A resposta seria a mesma.
- **Não comprar link, não trocar de domínio, não usar disavow.** Não há link ruim para rejeitar, e domínio novo só zera o histórico.
- **Não mexer em tudo de novo toda semana.** Fazer as mudanças, publicar, e deixar o Google reler por algumas semanas antes de julgar.
- **Não pagar tráfego para o blog** até ter sinal de volta (decisão de 01/10 continua valendo).

---

## 8. Os 4 artigos da fila

| Artigo | Data marcada | Recomendação | Por quê |
|---|---|---|---|
| `mercado-do-casal` | 04/11 | **Publicar**, depois de trocar o fecho "O combinado para este domingo" | já tem vídeo agendado apontando para ele, e link quebrado em post social é pior; usa dado público atual (cesta do DIEESE de setembro/2026, capital por capital); zero travessão. **Compromisso que vem junto:** a tabela é do mês, então ou se atualiza todo mês ou se troca "setembro de 2026" por "o último dado disponível, conferido em ..." |
| `contas-do-comeco-do-ano` | 11/11 | **Publicar**, com o mesmo ajuste de fecho | vídeo agendado; é de época e tem 12 fontes oficiais |
| `imposto-de-renda-casal` | 14/11 (pausado) | **Segurar até fevereiro de 2027** | a Receita só publica as regras da declaração no começo do ano, então publicar agora é reescrever em fevereiro; é tema de imposto (alto risco de erro) e pede revisão de contador (pergunta 10) |
| `black-friday-casal` | 18/11 (pausado) | **Não publicar em 2026** | assunto saturado e comercial, seria o 3º artigo novo durante a pausa, e não traz nada próprio. Fica como rascunho para avaliar em 2027 |

**Opção da Duda, se preferir pausa total:** segurar também os 2 primeiros e trocar o link dos vídeos de 04/11 para `/blog/morar-junto-dividir-despesas` e de 11/11 para `/blog/13-salario-casal`. Minha recomendação é publicar os dois: dois artigos em duas semanas não é escala, e os dois têm dado real.

**Cuidado técnico:** os dois sobem juntos com `git push origin 6b614ea:feat/hardening-and-blog` (o sha do segundo traz o primeiro). Os dois commits também mexem em 6 artigos que já estão no ar (só links novos para eles). Se a limpeza de 7(a) for feita antes de 04/11, a fila de commits precisa ser rebaseada; mais simples é fazer a limpeza **depois** de 11/11, ou ajustar o fecho dos 2 dentro dos próprios commits da fila.

---

## 9. Como medir e o que esperar

- **A cada 2 semanas no Search Console:** impressões por página (não só cliques), e quantas URLs saem de "Detectada" ou "Rastreada" para "Indexada".
- **Sinal de que está voltando:** impressões diárias acima de zero em mais de uma página por vários dias seguidos. O primeiro a voltar, se voltar, deve ser o Nubank.
- **Prazo honesto:** o Google diz que, depois de corrigir, os sistemas levam meses para perceber, e que a mudança costuma aparecer numa atualização futura. Contem com **nada antes de 2 a 3 meses** e com a próxima atualização grande (core update) como o momento mais provável. Pode não voltar.
- **O teto é baixo:** mesmo a volta completa era 30 a 60 impressões por dia e quase nenhum clique. O blog sozinho não sustenta o Paca no curto prazo; o que mais move a aprovação no AdSense e a confiança do Google é o que só vocês têm (calculadoras, planilha testada, casos reais).
- **Revisão do AdSense:** só quando houver impressões de volta por algumas semanas e a lista da Fase 6 do `PLANO-APROVACAO-ADSENSE.md` estiver inteira.

---

## 10. Esforço total

| Bloco | Produção (IA + dev) | Tempo da Duda |
|---|---|---|
| (a) técnico, a1 a a5 | ~3 h | 0 |
| (a) limpeza de molde, a6 | ~9 h | ~5 h de leitura |
| (b) consolidação | ~8 h | ~1 h de leitura |
| (c) conteúdo real | 1 a 2 h por artigo | 1 h de conversa + leitura final |
| **Total sem (c)** | **~20 h** | **~6 h** |

Ordem: (a1 a a5) e (b) primeiro, porque não dependem de ninguém; (a6) em lotes de 5 artigos por semana, com a leitura da Duda; (c) conforme as respostas chegarem. Publicar em blocos, não um commit por dia, para não virar outra rajada de mudanças.
