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

- [ ] 🤖👤 **Medição zero no blog** — não há Meta Pixel nem analytics; o `BaseLayout` tem só um comentário marcando onde entram. Sem isso: (a) o RPS é incalculável, então a régua `CPL ≤ RPS × 1,30` não tem denominador; (b) a campanha do Meta não pode ser otimizada por conversão nem devolver sinal por CAPI. **A IA instala** o analytics e a estrutura de UTM sozinha; **você passa** o ID do Pixel. *É o item que trava tudo o que vem depois.*
- [ ] 👤 **Análise do AdSense em curso** — nada a fazer além de não estragar. Conta `ca-pub-6444699882561703`, propriedade verificada, `ads.txt` correto, mensagem de consentimento escolhida. Leva de dias a semanas.
- [ ] 👤🤖 **No dia da aprovação, três passos na ordem** — (1) criar **duas unidades de anúncio** no painel do AdSense; (2) pôr os IDs na Vercel (`PUBLIC_ADSENSE_SLOT_FIRST_FOLD`, `PUBLIC_ADSENSE_SLOT_IN_CONTENT`); (3) **forçar um redeploy**. O blog é estático e assa a variável no build — sem o passo 3 você cola os IDs, não vê anúncio nenhum e vai caçar bug que não existe.
- [x] ✅ **Migrations 00023–00033 aplicadas e funções redeployadas** (2026-09-02). A captura de e-mail passou a gravar de verdade (antes o formulário estava no ar perdendo assinante em silêncio), o convite de casal foi para as RPCs novas, e deletar conta de quem criou o casal parou de falhar. **Achado no caminho:** a `check-budgets` estava **publicamente executável** com a chave anônima do app — o código que corrigia isso nunca tinha sido deployado.
- [x] ✅ **AdSense configurado** (2026-09-02). Conta nova (as antigas eram de terceiros ou do perfil espanhol). **Decisão revista:** ficou na Espanha, não no CNPJ, porque a dona mora lá — o endereço recebe a carta com o código de saque, que era o risco real. A regra do `docs/arbitragem` assumia operação brasileira; a premissa mudou.
- [x] ✅ **Domínio próprio do app** (2026-09-02): **app.pacafinance.com.br** no ar. Os dois projetos Vercel foram consolidados numa conta só — o `paca-web` da conta atual servia um site em francês sem relação com o Paca. **Falta:** apagar o projeto antigo `paca-web-twmh` e pôr o novo endereço no *Site URL* e nos *Redirect URLs* do Supabase.

---

## 🤖 Fila de execução da IA

Achados da auditoria de 6 frentes (2026-09-03), já filtrados por revisores céticos. Ordenado por retorno por hora. Nada aqui depende de você.

### Receita — o teto do RPS

- [ ] **O segundo anúncio fica a 82% da rolagem** — medido em tela de celular: o artigo tem no máximo 2 impressões possíveis, e a segunda exige chegar à 18ª tela de 22. Na prática o RPS nasce preso a ~1 impressão por sessão. É o teto de receita do modelo inteiro.
- [ ] **Zero anúncio em 14 páginas que não são artigo** — inclusive a calculadora, que é o destino natural de um anúncio seu no Meta ("calculadora de divisão de contas"). Hoje é receita zero em cima de tráfego que você vai *comprar*.
- [ ] **Nenhum link do blog carrega UTM** — sem isso não dá para separar a sessão que veio da campanha paga da que veio do reengajamento, que a estratégia manda medir separado.

### Conteúdo — erro factual e promessa que não se cumpre

- [ ] **"53% dos casais" em 11 artigos, quando as fontes dizem "53% dos brasileiros"** — é o número mais repetido do site e está na descrição que aparece no Google. Mesmo tipo de erro da estatística da Serasa que já foi corrigida uma vez.
- [ ] **O título "Planilha de gastos: modelo grátis" promete um arquivo que o 2º parágrafo do próprio artigo diz não existir** — a honestidade está certa; o título é que está errado. É a página onde o clique pago vai queimar. *Conserto definitivo depende da planilha real (👤 abaixo); enquanto isso, o título pode parar de prometer.*

### Descoberta — canais fechados por construção

- [ ] **Zero imagem indexável nos 18 artigos** — nenhum `<img>` de conteúdo. Google Imagens fica em zero por construção, e o card grande do Discover não existe. Discover é o canal que mais entrega volume barato em conteúdo de finanças pessoais.
- [ ] **Nenhuma página emite `meta robots`** — falta `max-image-preview:large`, que liga a prévia de imagem grande em todas as superfícies do Google. Só rende quando existir imagem indexável, então anda junto com o item acima.
- [ ] **As 4 páginas de crédito e dívida não recebem nenhum link editorial** — são justamente os ângulos de maior valor comercial, e estão órfãs na malha interna.
- [ ] **17 dos 18 títulos passam de 60 caracteres** depois do sufixo "| Paca Finance" — o Google trunca e às vezes reescreve; nos piores o corte cai em cima da palavra-chave.
- [ ] **Os 5 hubs de categoria têm H1 de uma palavra** ("Organização") enquanto o `<title>` da mesma página já carrega o termo pronto.
- [ ] **`/` e `/blog` são duas listas quase idênticas**, ambas indexáveis e ambas no sitemap — 80% das frases se repetem. Risco de o Google eleger a errada como entrada da marca.
- [ ] **Nenhum JSON-LD fora dos artigos** — falta `Organization` com `sameAs` e `WebSite`. Sem entidade de site, o Google não tem sinal para separar o blog do projeto de cripto homônimo (ver risco abaixo).
- [ ] **A calculadora está fora do menu e de todos os hubs** — inclusive do hub que se chama "Ferramentas", que promete uma ferramenta e entrega 5 artigos.
- [ ] **Sitemap sem `lastmod`** em nenhuma das 31 URLs — sem esse sinal, atualizar conteúdo (a alavanca orgânica mais barata) não avisa ninguém.

### Funil — o celular não tem recirculação

- [ ] **A barra lateral só existe acima de 1152px** — no celular, que é onde o tráfego pago vai cair, a única recirculação está depois de 2.400 palavras. A estrutura entrega perto de 1 pageview monetizável por sessão.
- [ ] **A calculadora não pede e-mail** — é o clique de maior intenção do site (a pessoa acabou de digitar as duas rendas do casal) e a única página de alta intenção sem captura.
- [ ] **A newsletter não tem isca** — promete "avisamos quando sai um guia novo" para alguém que chegou de um anúncio há 12 minutos e não conhece a marca.

### Higiene e conformidade

- [ ] **A página de descadastro chega ao leitor como código HTML cru** — o gateway do Supabase rebaixa o `Content-Type` para `text/plain`. A baixa é gravada de verdade, então o opt-out é honrado; o dano é de percepção, no único canal onde a margem fecha. *Exige redeploy da função.*
- [ ] **`PRIVACY_URL` da função `blog-unsubscribe` ainda aponta para a política do app** — mesmo problema dos links já corrigidos no site; só muda com redeploy da função.
- [ ] **`app.pacafinance.com.br` devolve 200 para qualquer URL inexistente e não tem `robots.txt`** — soft-404 infinito num domínio irmão da marca, sem `noindex`. Piora o problema de entidade em vez de ajudar.

### Feito nesta rodada

- [x] **Blocos de anúncio vazios em produção** — cada artigo servia duas faixas de 280px em branco com o rótulo "Publicidade" em cima do vazio, justamente durante a análise do AdSense. Causa: uma chave só governava duas coisas com tempos diferentes — o `pub-` (necessário na análise) ligava também os blocos, que precisam de um `data-ad-slot` que só existe depois da aprovação. Agora são duas chaves.
- [x] **Cinco artigos com data de publicação no futuro** (até 08/09, com hoje em 03/09) — e eram os de maior valor comercial. Data futura lê como manipulação numa revisão manual. As 18 datas foram reatribuídas preservando a ordem; a tabela de fundos das capas foi resolvida por busca, porque as três regras de vizinhança se cruzam e corrigir à mão quebrava outra duas linhas abaixo.
- [x] **Três links "Política de Privacidade" levavam para a política do app**, em inglês, que diz "We do not sell or share your data with advertisers" — o oposto do que este site faz, na página que o revisor do AdSense abre.
- [x] **Capas novas com o mascote** — as antigas eram formas geométricas genéricas; a grade lia como banco de imagem e o card de compartilhamento não levava marca nenhuma. Palavra gigante = categoria no site, título no compartilhamento.
- [x] **CTAs levavam para a tela de login** — todo botão ia para a raiz do app, que é rota protegida. Agora são 92 links para o cadastro e zero para o login. *Era o maior vazamento do site.*
- [x] **Estatística da Serasa invertida** — o blog publicava "66% nunca conversaram sobre dinheiro"; a fonte diz "65% **falam** abertamente". Erro de briefing da própria IA.
- [x] **Os 12 diagramas renderizavam quebrados em produção** — linha em branco dentro de bloco `<svg>` encerra o HTML no markdown. O texto alternativo seguia certo, então nada denunciava no código.
- [x] **Zero testes automatizados** — 265 testes no runner nativo do Node, sem dependência nova. Provados por mutação: 6 bugs injetados, todos pegos. Rodar: `npm test`.
- [x] **Acessibilidade** — 7.778 elementos em 26 páginas × 2 temas, zero reprovação AA no fim.
- [x] **Auto-hospedar as fontes — medido e descartado.** Ganho de 8 a 20 ms não paga 77 KB no repositório. Decisão com número, não palpite.

---

## 👤 Só você consegue

### Decisões que destravam a IA

- [ ] **ID do Meta Pixel** — a metade do bloqueador de medição que depende de você.
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
- **Branch `feat/hardening-and-blog` está 39 commits à frente do `main`** e é dela que o blog deploya. Mergear leva o código novo do app ao ar junto; decidir na hora certa.
- **iPad obrigatório:** `supportsTablet: true` torna os screenshots 2048×2732 obrigatórios na App Store.

---

## Apêndice — runbooks

Deploy do banco e das funções: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
Estratégia de monetização por conteúdo: [`docs/arbitragem/`](docs/arbitragem/).
Submissão nas lojas: [`SUBMISSION.md`](SUBMISSION.md).
