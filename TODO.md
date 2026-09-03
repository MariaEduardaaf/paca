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

Achados da auditoria de 6 frentes (2026-09-03). O que sobrou aqui é o que **não** dá para resolver
só com código — precisa de decisão de conteúdo ou de um dado que ainda não existe.

### Aberto

- [ ] **Zero imagem indexável nos 18 artigos** — nenhum `<img>` de conteúdo, então Google Imagens
  fica em zero por construção e o card grande do Discover não aparece. Os diagramas existem, mas são
  SVG embutido no texto, que o Google não indexa como imagem. O `meta robots` que liga a prévia
  grande já está no ar esperando por isso. *É o maior item aberto da fila e precisa de uma decisão:
  usar a capa de cada artigo como imagem de verdade no topo, ou produzir imagem por artigo.*
- [ ] **8 títulos ainda passam de 60 caracteres** — dois deles com 70, visivelmente cortados no
  Google. Encurtar custa palavra-chave, então é troca e não conserto: precisa da sua decisão caso a caso.
- [ ] **Nenhum link do blog carrega UTM** — sem isso não dá para separar a sessão que veio da campanha
  paga da que veio do reengajamento. *Faz parte do mesmo trabalho da medição (bloqueador acima) e só
  vale fazer junto.*
- [ ] **A newsletter não tem isca** — promete "avisamos quando sai um guia novo" para quem chegou de
  um anúncio há 12 minutos. A isca óbvia seria a planilha, que depende de você criar (👤 abaixo).
- [ ] **A home não tem anúncio** — decisão em aberto, não esquecimento: ela virou a porta da marca e
  anúncio ali cobra um preço de confiança. Vale rever quando houver receita medida.
- [ ] **`app.pacafinance.com.br` ainda responde 200 em URL inexistente** — o `robots.txt` já barra o
  rastreamento, mas o soft-404 de verdade só some mexendo no roteamento do app web.

### Feito em 2026-09-03

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
