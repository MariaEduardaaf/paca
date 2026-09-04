# Paca Finance — board de trabalho

> **Fonte de verdade:** o **código** e o que responde em produção (verificado em 2026-09-03: typecheck 7/7, 265 testes, build do blog 32 páginas) e o **que responde na internet**. Doc é hipótese; em conflito, vale o código.
> **Como usar:** `🤖` = a IA faz sozinha · `👤` = depende de você (conta externa, decisão, dado pessoal) · `🔴` = está travando dinheiro ou lançamento.
> `#NN` = issue no GitHub (`MariaEduardaaf/paca`).

## Onde estamos

Três produtos, estados diferentes:

- **Blog** — no ar em **blog.pacafinance.com.br** com 18 artigos, calculadora, captura de e-mail, SEO técnico completo e capas próprias. AdSense **em análise**. Não exibe anúncio ainda e **não mede nada**.
- **App web** — no ar em **app.pacafinance.com.br**, domínio próprio com certificado válido. Backend saudável, migrations aplicadas.
- **App mobile** — código pronto, faltam três integrações nativas e a submissão nas lojas.

**O gargalo do momento:** o blog não tem **medição**. Sem Meta Pixel e sem analytics não existe como saber quanto rende uma sessão — que é a única regra de decisão da estratégia de arbitragem (`CPL ≤ RPS × 1,30`). Comprar mídia antes disso é gastar sem sinal de parada. O segundo gargalo é a **análise do AdSense**, que não depende de nós: enquanto ela não sai, receita é zero por definição.

---

## 🔴 Bloqueadores

- [x] ✅ **Medição ligada** (2026-09-03). Meta Pixel `1762784665056623` no blog (32/32 páginas) e na
  landing, com guarda de domínio — não dispara em localhost nem em pré-visualização da Vercel, que
  sujariam justamente o número que decide o gasto. Provado no ar: o Facebook respondeu com a
  configuração do pixel para `blog.pacafinance.com.br`. Só `PageView`; nenhum dado financeiro, que
  as Ferramentas Comerciais da Meta proíbem. **Correspondência avançada automática ficou DESLIGADA**:
  ela varre formulário e mandaria o e-mail da newsletter ao Meta, contradizendo a política e a LGPD.
- [ ] 👤 **Análise do AdSense em curso** — nada a fazer além de não estragar. Conta `ca-pub-6444699882561703`, propriedade verificada, `ads.txt` correto, mensagem de consentimento escolhida. Leva de dias a semanas.
- [ ] 👤🤖 **No dia da aprovação, três passos na ordem** — (1) criar **duas unidades de anúncio** no painel do AdSense; (2) pôr os IDs na Vercel (`PUBLIC_ADSENSE_SLOT_FIRST_FOLD`, `PUBLIC_ADSENSE_SLOT_IN_CONTENT`); (3) **forçar um redeploy**. O blog é estático e assa a variável no build — sem o passo 3 você cola os IDs, não vê anúncio nenhum e vai caçar bug que não existe.
- [x] ✅ **Migrations 00023–00033 aplicadas e funções redeployadas** (2026-09-02). A captura de e-mail passou a gravar de verdade (antes o formulário estava no ar perdendo assinante em silêncio), o convite de casal foi para as RPCs novas, e deletar conta de quem criou o casal parou de falhar. **Achado no caminho:** a `check-budgets` estava **publicamente executável** com a chave anônima do app — o código que corrigia isso nunca tinha sido deployado.
- [x] ✅ **AdSense configurado** (2026-09-02). Conta nova (as antigas eram de terceiros ou do perfil espanhol). **Decisão revista:** ficou na Espanha, não no CNPJ, porque a dona mora lá — o endereço recebe a carta com o código de saque, que era o risco real. A regra do `docs/arbitragem` assumia operação brasileira; a premissa mudou.
- [x] ✅ **Domínio próprio do app** (2026-09-02): **app.pacafinance.com.br** no ar. Os dois projetos Vercel foram consolidados numa conta só — o `paca-web` da conta atual servia um site em francês sem relação com o Paca. **Falta:** apagar o projeto antigo `paca-web-twmh` e pôr o novo endereço no *Site URL* e nos *Redirect URLs* do Supabase.

---

## 🤖 Fila de execução da IA

Achados da auditoria de 6 frentes (2026-09-03). O que sobrou aqui é o que **não** dá para resolver
só com código — precisa de decisão de conteúdo ou de um dado que ainda não existe.

### Aberto

- [ ] **4 títulos ainda passam do corte do Google** — 62 a 69 caracteres, contra ~60 de limite. Há
  proposta pronta para os quatro, mantendo a palavra-chave; encurtar custa nuance, então é **decisão
  dela**, não conserto. Outros quatro estão em 61 — dentro do ruído, não vale mexer.
- [ ] **A newsletter não tem isca** — promete "avisamos quando sai um guia novo" para quem chegou de
  um anúncio há 12 minutos. A isca óbvia é a planilha, que depende de você criar (👤 abaixo).
- [ ] **A home não tem anúncio** — decisão em aberto, não esquecimento: ela é a porta da marca e
  anúncio ali cobra um preço de confiança. Rever quando houver receita medida.
- [ ] **O UTM de ENTRADA não é levado adiante** — hoje o blog marca de onde a pessoa clicou *dentro
  do site*, mas o app não sabe se ela veio do anúncio ou do e-mail, porque esse dado só existe na URL
  de chegada. Fechar isso é guardar o UTM de entrada na sessão e repassar. *Só vale fazer junto com o
  Pixel — depende do ID que você vai passar.*

### Feito em 2026-09-03 (segunda rodada)

- [x] **Zero imagem indexável nos 18 artigos** — era o maior item da fila. A capa era desenhada em
  HTML/CSS, então Google Imagens ficava em zero por construção e o card grande do Discover não
  aparecia. Agora cada capa é PNG de verdade (23 arquivos, 20 KB de média), com `alt` que descreve a
  imagem e o assunto. O componente mudou por dentro: os 5 pontos de uso não mudaram uma linha.
  Herói com `eager`+`fetchpriority`, listagem com `lazy`. Gerar: `npm run capas`.
- [x] **Nenhum link carregava UTM** — sem isso não dava para saber, artigo por artigo, se vale
  empurrar o app ou segurar a pessoa no blog. Ficou centralizado no `BaseLayout`: marcar os ~10
  arquivos à mão seria frágil, porque o próximo link nasceria sem UTM. O `utm_medium` sai da
  estrutura do DOM, não de rótulo — mudar um texto não pode trocar coluna de relatório em silêncio.
  Como é JS, o rastreador vê a URL limpa: nada de URL duplicada no índice.
- [x] **Estrutura do Meta Pixel montada e desligada** — mesmo padrão do AdSense: sem
  `PUBLIC_META_PIXEL_ID` não sai nada (0 arquivos); com ela, 32/32. Falta só o seu ID.
- [x] **`app.pacafinance.com.br` respondia 200 em URL inexistente** — espaço infinito de soft-404 num
  domínio que já disputa nome com um projeto de cripto. Ganhou rota curinga com `noindex`. Limite
  honesto: em SPA estático a resposta segue 200 — o `noindex` resolve o índice, não o status.
- [x] **`/capas` sem cache** — ganhou o mesmo header `immutable` que `/og` já tinha; sem ele os 480 KB
  revalidavam a cada navegação.

### Feito em 2026-09-03 (primeira rodada)

- [x] **Anúncios presos em 4% e 82% da rolagem** — a segunda impressão exigia chegar à 18ª tela de 22,
  então a receita por sessão nascia presa a ~1 impressão. Agora são 4 posições: 2%, 28%, 52% e 80%.
- [x] **A calculadora não tinha anúncio nem captura** — é o destino natural de um anúncio do Meta e o
  momento de maior intenção do site. Ganhou 2 blocos e o pedido de e-mail.
- [x] **Sufixo de marca truncava 17 dos 18 títulos** — "| Paca Finance" era somado sempre. Virou
  condicional: 17 → 8 acima de 60 caracteres.
- [x] **Nenhuma página emitia `meta robots`** — `max-image-preview:large` agora em 32/32.
- [x] **Nenhum dado estruturado fora dos artigos** — `Organization` + `WebSite` nas 32 páginas. Sem
  `SearchAction`: não existe rota de busca no blog e não se inventa uma.
- [x] **H1 dos 5 hubs era uma palavra** — passou a usar o termo completo, que já existia em
  `categories.ts`.
- [x] **Sitemap sem `lastmod`** — agora em 26 das 31 URLs (as 5 sem data são páginas fixas).
- [x] **A calculadora estava fora do menu e de todos os hubs** — inclusive do hub "Ferramentas".
  Entrou em primeiro no menu; "Contato" cedeu o lugar e segue no rodapé de todas as páginas.
- [x] **`/` e `/blog` eram duas listas dos mesmos 18 artigos** — a home virou porta da marca (pilar
  em destaque + 4 caminhos por situação) e `/blog` virou arquivo por mês. Sobreposição: 80% → 34%.
- [x] **No celular a recirculação só vinha após 2.400 palavras** — agora há um bloco a 38% do artigo.
- [x] **4 páginas de crédito e dívida sem link editorial** — os ângulos de maior valor comercial
  estavam órfãos. Cada uma recebe 3 links agora.
- [x] **"53% dos casais" em 11 artigos** — a fonte diz "53% dos **brasileiros**". Era o número mais
  repetido do site, e estava até na meta description e dentro do SVG de um diagrama.
- [x] **Título prometia planilha que não existe** — o 2º parágrafo do próprio artigo desmentia o
  título. Agora promete o que a página entrega, mantendo o termo de busca.
- [x] **Descadastro chegava como código HTML cru** — o gateway do Supabase reescreve toda resposta de
  função para `text/plain`, e nenhum cabeçalho contorna isso: a página bonita que a função montava
  nunca ia chegar. A função agora faz a baixa e redireciona para `/descadastro?estado=…`. Verificado
  no ar: 302 → 200 `text/html`.
- [x] **`PRIVACY_URL` da função apontava para a política do app** — sumiu junto com a página.
- [x] **`app.pacafinance.com.br` sem `robots.txt`** — nem o próprio `/robots.txt` escapava do rewrite
  do SPA. Ganhou um, com o porquê escrito no arquivo.

---

## 👤 Só você consegue

### Decisões que destravam a IA

- [ ] **Autoria com pessoa real.** Hoje é "Equipe Paca Finance", sem nome nem rosto, e o schema declara autor como organização. Finanças é a categoria em que o Google aplica a régua mais dura, e essa é a lacuna mais visível do site. *A IA monta a estrutura inteira; você passa o texto sobre você e decide se topa assinar.*
- [ ] **CNPJ ou razão social na política de privacidade** — não existe nenhuma identificação de quem é juridicamente o controlador dos dados. Custa uma linha de texto. Também importa no recebimento: o AdSense paga a um titular identificado.
- [ ] **Planilha de verdade no Google Sheets.** O artigo se chama "modelo grátis" e avisa que não há arquivo — quem busca essa palavra quer o arquivo. A IA entrega a estrutura pronta; você cria e torna público.
- [ ] **Provedor de e-mail.** A captura grava no banco, mas **nada envia e-mail ainda**. Sem isso o multiplicador de sessões por lead fica travado em 1,0 — e é o reengajamento que fecha a margem na estratégia. É a diferença entre a operação empatar e lucrar.
- [ ] **Double opt-in** (depende do provedor acima) — hoje o consentimento é um booleano vindo do navegador e ninguém confirma que o endereço é do titular. O risco real não é jurídico, é entregabilidade: com tráfego pago entrando num formulário assim, a lista acumula erro de digitação e endereço de terceiro, e o primeiro disparo — o que estabelece a reputação do domínio — sai com bounce alto.
- [ ] **Prova social.** Nenhum depoimento ou número no site; o botão pede para criar conta num app que a pessoa nunca ouviu falar.

### Contas e configuração

- [ ] `#3` `#4` **Login Google e Apple (web)** — consent screen, OAuth client, Service ID.
- [ ] `#7` `#8` **RevenueCat + produtos de assinatura nas lojas** (mensal R$ 24,90 / anual R$ 179,90, trial 7 dias).
- [ ] `#20` **Teto de gasto no Gemini** (billing budget no Google Cloud).
- [ ] `#14` **Popular `partner_offers`** — a aba Recomendações fica vazia até ter dados reais.
- [ ] `#13` **RevenueCat → Meta CAPI** (atribuição server-side).
- [ ] 🔐 **Rotacionar `REVENUECAT_WEBHOOK_SECRET`** — o valor esteve no histórico do git.
- [ ] `#21` **Submissão nas lojas** — screenshots (iPhone 6.7" + **iPad 13" obrigatório**), listing, demo account, formulários de privacidade. Ver `SUBMISSION.md`.
- [x] ✅ **Search Console** (2026-09-02): domínio verificado por DNS e sitemap submetido. Bing fica como próximo passo opcional.
- [x] `#6` **Desligar "Confirm email"** — verificado pela API do Supabase, issue fechada.

### Mobile — precisam de dev build

- [ ] `#9` **RevenueCat**: instalar `react-native-purchases` e ligar o `billing.ts` (hoje é stub).
- [ ] `#10` **Push**: instalar `expo-notifications` e capturar o token no `_layout`.
- [ ] `#5` **Login social no mobile** (o web já está pronto no código).

---

## ⚠️ Riscos

- **Colisão de marca.** "Paca Finance" é hoje também um projeto de cripto: perfil no X, canal no YouTube prometendo "explosive returns", e o domínio `paca.finance` publicamente marcado como golpe. Dois efeitos: a busca de marca — o tráfego mais barato que existe e o destino natural do reengajamento — cai em conteúdo de cripto; e quem analisa a conta no AdSense e no Meta pesquisa o nome. Não tem conserto técnico: é decisão de marca.
- **Comprar mídia sem medição.** A estratégia tem uma regra de parada e ela não é calculável hoje. O risco não é gastar errado uma vez, é gastar errado por dias sem perceber.
- **Cadência encenada.** O post de boas-vindas promete "pelo menos um artigo por semana"; as datas encenavam um por dia. As datas foram corrigidas, a promessa continua sem lastro — 18 artigos saíram juntos e nada foi publicado desde então.
- **Impressão estilística uniforme.** 18 de 18 artigos terminam em "## Perguntas frequentes" e a densidade de travessão é alta e constante. O conteúdo em si foi conferido e não é vazio — a matemática e as fontes batem —, mas a uniformidade é um sinal que revisor humano nota.
- ~~Branch à frente do main~~ **Resolvido em 2026-09-04**: mergeada (PRs #30/#31 + merge direto).
  Blog e app agora saem do mesmo código; o conserto do idioma foi ao ar com o merge.
- **iPad obrigatório:** `supportsTablet: true` torna os screenshots 2048×2732 obrigatórios na App Store.

---

## Apêndice — runbooks

Deploy do banco e das funções: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
Estratégia de monetização por conteúdo: [`docs/arbitragem/`](docs/arbitragem/).
Submissão nas lojas: [`SUBMISSION.md`](SUBMISSION.md).
