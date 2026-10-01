# Plano de aprovação no AdSense — pacafinance.com.br

> Escrito em 2026-10-01, depois da reprovação por **"Conteúdo de baixo valor"**.
> Fontes: as 4 páginas de política que o próprio aviso linka (conferidas nesta data) + o site no ar
> + este repositório. O que **não** foi verificado está marcado ⚠️.

## 0. O diagnóstico em uma frase

O Google não reprovou um artigo: ele reprovou **o site inteiro por parecer volume sem diferencial**.
São 21 artigos de ~2.500 palavras publicados quase um por dia (17/08 → 04/09), num site de 6 semanas,
sobre um tema que muitos outros sites já cobrem, todos no mesmo molde (18 de 21 fecham com FAQ), e uma página de autora com
trecho "entra em breve". A IA não é o problema; **escala sem valor próprio** é.

O aviso pede três coisas. Este plano ataca cada uma:

| O Google pede | Hoje | Fase que resolve |
|---|---|---|
| "informações, ferramentas ou serviços autênticos e de alta qualidade" | 1 calculadora; o resto é guia genérico | 3 |
| "curadoria e manutenção estrutural contínuas" | rajada de 3 semanas e depois parou; mesmo molde em quase todos | 1, 2, 5 |
| "interesse genuíno do usuário" | **0 cliques orgânicos em setembro** (Search Console) | 4 |

**Não existe número mínimo** de artigos, palavras ou idade de domínio na política (conferido em
2026-09-03). Então o plano não é "escrever mais", e sim **ter menos páginas, cada uma mais forte, e provar que tem gente lendo**.

---

## Fase 0 — Hoje (sem custo)

- [ ] **Não clicar em "Pedir revisão".** Revisão com o site igual tende a dar a mesma resposta.
- [ ] **Pausar a publicação diária.** Os 2 rascunhos (`renda-extra`, `regime-de-bens`) ficam como
      rascunho até a Fase 5.
- [ ] **Não comprar tráfego no Meta para o blog** até aprovar. Clique pago com saída rápida não é
      "interesse genuíno", e o custo sai do caixa sem receita de anúncio para pagar
      *(inferência, não está escrito na política)*.
- [x] **Search Console verificado** (propriedade de domínio `pacafinance.com.br`, print de 2026-10-01).
      **Dado que confirma o diagnóstico:** **0 cliques** orgânicos de 01/09 a ~28/09. A única página
      com impressões em alta é `conta-conjunta-nubank`, que é o tema que já sai na frente.
- [x] **Sitemap** `sitemap-index.xml` enviado em 02/09, status *Processado*, 36 páginas encontradas.
- [x] **Indexação (atualizada em 21/09): 24 indexadas, 17 não.** Os motivos:
      | motivo | páginas | leitura |
      |---|---|---|
      | **Detectada, mas não indexada no momento** | **14** | o Google sabe que a página existe e **decidiu não buscá-la**. Em site novo é fila, mas também é o sinal de que ele acha o site pouco prioritário. É o mesmo julgamento do AdSense, visto pelo lado da Busca |
      | Rastreada, mas não indexada | 1 | leu e achou que não valia indexar; candidata a juntar na Fase 2 |
      | Erro no servidor (5xx) | 1 | hoje todas as 36 URLs do sitemap respondem 200 (medido em 01/10); provavelmente foi falha passageira |
      | Bloqueada pelo robots.txt | 1 | é do `app.`, bloqueado **de propósito** (SPA com login). Não é defeito |
- [x] ✅ **CONSERTADO em 01/10** ("Sempre usar HTTPS" no Cloudflare; medido: `http://` → 301 → `https://blog.` 200, inclusive em subpáginas). Falta só **Validar correção** no Search Console. Era: **`http://pacafinance.com.br/` respondia 522** (medido em 01/10; é a URL do 5xx
      no Search Console). O `https://` redireciona certo para o `blog.`; o `http://` cai na origem
      e dá timeout. **É o endereço que você cadastrou no AdSense**, e o revisor pode chegar por ele.
      **Conserto (Cloudflare → pacafinance.com.br → SSL/TLS → Certificados de borda):** ligar
      **"Sempre usar HTTPS"**. Conferir com `curl -I http://pacafinance.com.br/` (tem que dar 301) e
      então clicar em **Validar correção** no Search Console.
- [x] **As 14 "Detectada, mas não indexada"** (lista de 01/10):
      - **4 artigos:** `cartao-de-credito-casal`, `casal-endividado-como-sair-das-dividas`,
        `como-dividir-contas-casal`, `quanto-custa-casar`.
      - **A calculadora** (`/calculadora-divisao-de-contas`) e a **página da autora**. São justamente as
        duas páginas que mais provam valor próprio, e o Google ainda não as buscou.
      - **8 páginas de apoio:** `/categorias` + 4 categorias, `/contato`, `/descadastro`,
        `/privacidade`. Ficar fora do índice é normal para elas; `/descadastro` deveria ter `noindex`.
- [ ] Levar link interno forte para a calculadora: menu já tem; colocar também no topo dos artigos de
      dividir contas e na home. **Não** pedir indexação manual de uma por uma: isso não muda o julgamento
      de qualidade.

## Fase 1 — Tirar os sinais de "site em construção" (semana 1)

- [ ] **Página da autora:** hoje mostra no ar *"Esta parte está sendo escrita pela própria Mary e
      entra em breve"*. Ou a Mary escreve a bio em primeira pessoa (com foto e experiência real com o
      tema), ou o bloco sai. "Em breve" na página que prova quem escreve é o pior lugar possível.
      ⚠️ A pessoa tem que ser **real**; persona inventada é um problema que o Google cita por nome nas diretrizes.
- [ ] **"Bem-vindos ao blog do Paca"** (365 palavras): incorporar ao `/sobre` e redirecionar (301).
      É a página mais fina do site.
- [ ] **Varredura técnica:** links quebrados, 404, menu funcionando no celular, todas as categorias
      com conteúdo. O Google cita "links enganosos, páginas quebradas" na página de requisitos.
- [x] Política de privacidade cita cookies de terceiros (conferido: `privacidade.astro`).
- [x] Sobre, contato, termos, política editorial e divulgação de IA existem.

## Fase 2 — Medido em 01/10: quase não há o que juntar

> ⚠️ **Esta fase previa "juntar o que se repete" e a medição desmentiu a previsão.** A versão anterior
> chutava 3 grupos para fundir e "15–17 páginas" no fim. Medido nos 21 publicados, a sobreposição é
> baixa. A prioridade passa para a Fase 3.

**Quanto um artigo se parece com outro** (similaridade de vocabulário, 0 = nada em comum, 1 = igual;
os 4 pares mais parecidos):

| par | similaridade | decisão |
|---|---|---|
| `conta-conjunta-nubank` × `conta-conjunta-vale-a-pena` | 0,27 | **manter os dois**: buscas diferentes ("Nubank tem conta conjunta?" é pergunta própria, e é a única página com impressões subindo) |
| `como-juntar-dinheiro-casal` × `reserva-de-emergencia-casal` | 0,21 | manter, com link cruzado |
| `como-dividir-contas-casal` × `dividir-contas-proporcional-ao-salario` | 0,19 | manter: um é o panorama de 4 métodos, o outro aprofunda um deles |
| `brigas-por-dinheiro` × `como-falar-de-dinheiro` | 0,17 | manter: momentos diferentes (em crise × antes dela) |

**Guardião nos 21 publicados:**
- Quase-duplicata: ✅ nenhum artigo acima de 30%; o pior caso é **2,7%** de texto repetido.
- Marcas de IA em português: ✅ 20 de 21 abaixo do teto; 5 artigos com **1 marca** cada (ex.: "robusto"
  em `melhor-app`, "vale lembrar" em `quanto-custa-casar`). Higiene, não risco.
- Cadência: ✅ 20 de 21. ⚠️ **Não é prova de "soa humano":** o piso vem do `VOICE.md`, medido sobre
  estes mesmos artigos. O teste confere se eles são coerentes entre si, não se são diferentes de IA.
- ⛔ **Única reprovação: `bem-vindos-ao-blog-do-paca`** (304 palavras, liso demais), que a Fase 1 já
  manda incorporar ao `/sobre`.

**O que a medição achou e o plano não previa: o esqueleto é igual.** 18 dos 21 terminam em
`## Perguntas frequentes`, e quase todos têm 6–9 seções. Uniformidade de molde é sinal de produção
em escala. Na reescrita da Fase 3, **tirar o FAQ onde ele só repete o texto** e deixar a estrutura
seguir o assunto.

**Ação da Fase 2, então, é pequena:**
- [x] `bem-vindos` → conteúdo (os 5 temas + "sugira uma pauta") foi para o `/sobre`; o post virou `draft: true` e a URL redireciona para `/sobre` (`vercel.json`, 308 permanente).
- [x] Corrigidas as 5 marcas pontuais ("por fim", 2× "vale lembrar", "sem esforço", "robusto").
- [x] Link para a calculadora **no corpo** de `como-dividir-contas-casal` e
      `dividir-contas-proporcional-ao-salario`. Hoje os dois artigos que mais pedem a calculadora
      não a citam no texto; só o painel de recirculação no rodapé leva até ela.
- [x] Links cruzados nos 4 pares: faltava só `como-juntar` → `reserva-de-emergencia`, acrescentado.

**Feito em 01/10, local, sem commit e sem deploy.** Verificado: `astro check` 0 erros, build com
35 páginas (o `bem-vindos` saiu do sitemap), `testa:medicao` ok, Guardião sem marca nos publicados.

## Fase 3 — O que só o Paca tem (semanas 2–6) ← a fase que decide

É aqui que o site deixa de ser "mais um blog de finanças". Em ordem de força:

1. **Ferramentas.** A calculadora de divisão já existe e é exatamente o que o Google chama de
   "ferramenta autêntica". Fazer mais 2–3 no mesmo molde:
   - simulador de reserva de emergência do casal;
   - calculadora de quanto custa casar (já tem artigo com os números);
   - simulador de "quanto cada um põe" para uma meta (viagem, casa).
   Cada artigo relacionado passa a terminar na ferramenta.
2. **Experiência própria.** Bloco em primeira pessoa da Mary (ou de casais reais, com permissão)
   em cada artigo-pilar: o que vocês viram construindo o app e conversando com casais. Esse tipo de
   conteúdo não dá para copiar de outro site.
3. **Dados próprios.** ⚠️ Números agregados do app (ex.: "X% dos casais no Paca dividem
   proporcionalmente") seriam o diferencial mais forte, **mas** exigem base de usuários suficiente
   e revisão LGPD/termos do app. Isso é decisão sua, e a regra dura nº 3 do repositório (leads do blog separados
   dos usuários do app) continua valendo.
4. **Revisar os artigos que ficam:** cortar trecho genérico, acrescentar exemplo com números em
   reais e mostrar "Atualizado em" quando a mudança for real.

## Fase 4 — Mostrar que tem leitor (em paralelo, semanas 1–8)

- [ ] Search Console ativo; acompanhar páginas indexadas e cliques orgânicos.
- [ ] Levar quem já usa o app para o blog (e-mail ou dentro do app, com links para as ferramentas).
- [ ] Newsletter que já existe: mandar o conteúdo novo para quem se inscreveu.
- [ ] Divulgação orgânica onde o tema é discutido (Pinterest, Instagram, grupos), sem spam.
- **Meta para pedir revisão:** ver páginas indexadas e algum clique orgânico todo dia no Search
  Console. ⚠️ O Google não publica um número mínimo; isso é um critério de bom senso nosso.

## Fase 5 — Cadência de site mantido (a partir da semana 3)

- 1–2 artigos por semana, **tamanho variável** (o que o tema pede, não sempre ~2.500 palavras).
- Todo artigo passa pela esteira do `CLAUDE.md`, com `/guardiao` e **a leitura final da Mary**.
  A política do AdSense diz literalmente para não pôr anúncio em conteúdo automático
  "sem revisão manual ou curadoria".
- Publicar os 2 rascunhos aqui, já no padrão novo.

## Fase 6 — Pedir a revisão

Só quando **tudo** abaixo for verdade:

- [x] `http://pacafinance.com.br/` e `https://pacafinance.com.br/` redirecionam (301) para o blog.
- [ ] Nenhuma página com "em breve" ou placeholder.
- [ ] `bem-vindos` incorporado ao `/sobre`, com 301.
- [ ] Pelo menos 3 ferramentas interativas no ar.
- [ ] Artigos-pilar com bloco de experiência própria.
- [ ] Publicação regular há pelo menos 4 semanas seguidas.
- [ ] Search Console mostrando indexação e tráfego orgânico.
- [ ] `/guardiao` sem alerta nos artigos publicados.

**Data-alvo:** não antes de **meados de novembro de 2026**. Ao pedir, marcar "Confirmo que corrigi
os problemas" só com esta lista inteira marcada.

**Se reprovar de novo:** voltar à Fase 3. Ferramentas e conteúdo próprio são o que muda a resposta,
não mais artigos.

---

## Decisões que são da Duda

1. **A Mary é uma pessoa real e vai escrever a bio e os blocos em primeira pessoa?** Se não for, a
   assinatura precisa mudar para quem escreve de verdade.
2. ~~Autorizar juntar artigos já publicados~~ — a Fase 2 mediu e só o `bem-vindos` sai.
3. **Usar dados agregados do app no blog?** (Fase 3, item 3; envolve LGPD e termos.)
4. **Segurar o tráfego pago** até a aprovação.
