# Paca Finance — board de trabalho

> **Fonte de verdade:** o **código** e o que responde em produção (verificado em 2026-09-02: typecheck 7/7, 265 testes, migrations aplicadas) e o **que responde na internet**. Doc é hipótese; em conflito, vale o código.
> **Como usar:** `🤖` = a IA faz sozinha · `👤` = depende de você (conta externa, decisão, dado pessoal) · `🔴` = está travando dinheiro ou lançamento.
> `#NN` = issue no GitHub (`MariaEduardaaf/paca`).

## Onde estamos

Três produtos, estados diferentes:

- **Blog** — no ar em **blog.pacafinance.com.br**, com 11 artigos, SEO completo, calculadora, captura de e-mail e política de privacidade. Funil e conversão já arrumados. O que falta é **monetização** (conta de anúncio indefinida) e **volume de conteúdo**.
- **App web** — no ar, mas em endereço da Vercel, que não passa confiança. Backend restaurado e saudável.
- **App mobile** — código pronto, faltam três integrações nativas e a submissão nas lojas.

**O gargalo do momento:** definir a **conta de anúncio** (nenhuma das existentes serve) e o **domínio próprio do app**. O banco já está em dia com o código.

---

## 🔴 Bloqueadores

- [x] ✅ **Migrations 00023–00033 aplicadas e funções redeployadas** (2026-09-02). A captura de e-mail do blog passou a gravar de verdade (antes o formulário estava no ar perdendo assinante em silêncio), o fluxo de convite de casal foi para as RPCs novas, e deletar conta de quem criou o casal parou de falhar. `CRON_SECRET` configurado e `check-budgets` agendado (`#11` fechada). **Achado no caminho:** a `check-budgets` estava **publicamente executável** com a chave anônima do app — o código que corrigia isso nunca tinha sido deployado. Verificado ponta a ponta: inscrição real gravando, consentimento e e-mail inválido recusados, leitura dos leads negada até com chave anônima.
- [ ] 👤 **Definir a conta de anúncio.** As contas existentes ou são de terceiros ou estão no perfil espanhol em euro (ver histórico de 2026-09-01). Precisa de uma AdSense no CNPJ, criada com um login Google limpo. Com o `pub-…` em mãos, a IA preenche o `ads.txt` e a env `PUBLIC_ADSENSE_CLIENT` — o anúncio liga sem deploy de código.
- [x] ✅ **Domínio próprio do app** (2026-09-02): **https://app.pacafinance.com.br** no ar com certificado válido. De quebra, os dois projetos Vercel foram consolidados numa conta só — o `paca-web` antigo (na outra conta) era duplicata e o `paca-web` da conta atual servia um site em francês sem relação com o Paca. As 19 referências ao endereço da Vercel foram trocadas no código (blog, política, termos, mobile, função de descadastro e `SUBMISSION.md`, que alimenta as lojas). **Falta:** apagar o projeto antigo `paca-web-twmh` e incluir o novo endereço no *Site URL* e nos *Redirect URLs* do Supabase.

---

## 🤖 Fila de execução da IA

Ordenado por retorno por hora. Nada aqui depende de você.

### Conversão — o funil vaza hoje
- [x] **CTAs levavam para a tela de login** — todo botão ia para a raiz do app, que é rota protegida e cai num formulário de senha de uma conta que o leitor não tem. Agora são 92 links para o cadastro e zero para o login, com rótulos honestos ("Criar a conta do casal"). *Era o maior vazamento do site.*
- [x] **Captura de e-mail no lugar errado** — vinha depois dos cards que convidam o leitor a sair, e só existia na home e nos posts. Agora vem antes do "Leia também" e está em /blog, nas categorias e no /sobre. O estado de sucesso deixou de ser um beco sem saída.
- [x] **CTA de produto igual em todo artigo** — "Chega de planilha" aparecia até no artigo sobre brigas de casal. Agora cada um fala da dor do próprio texto, com ressalva honesta; o comparativo de apps declara conflito de interesse e manda ficar com outro se encaixar melhor.
- [x] **Botão de mandar para o parceiro** — não existia, e nesse nicho é perda direta: quem lê está lendo para combinar algo com a outra pessoa. WhatsApp primeiro, copiar link e compartilhamento nativo no celular.

### Conteúdo e busca
- [x] **Estatística inversa da Serasa corrigida** — o blog publicava "66% nunca conversaram sobre dinheiro"; a fonte diz "65% **falam** abertamente". Erro de briefing da IA, corrigido em 4 artigos com reescrita dos trechos que se apoiavam nele.
- [x] **Títulos desalinhados da busca real** — agora contemplam "dividir contas" e "salários diferentes" (as formulações que as pessoas usam), sem trocar slug. Cards de compartilhamento regerados.
- [x] **Páginas de categoria vazias** — recebem a maior parte do link interno do site e eram um título de uma palavra; /categorias respondia 404. Cada uma ganhou title, description e introdução própria, o índice foi criado e entrou no sitemap.
- [x] **Malha de links interna com buracos** — 7 links contextuais novos; o comparativo de apps, página de maior intenção comercial, passou de 2 para 4 links recebidos.
- [x] **Três artigos novos** (14 no total): conta conjunta no Nubank, um dos dois desempregado, e reserva de emergência do casal. Cada fato conferido na fonte antes de escrever; o de reserva não recomenda produto nem cita rentabilidade.

### Ferramenta — a página que traz gente de volta
- [x] **Calculadora de divisão proporcional** — no ar em `/calculadora-divisao-de-contas`. Três artigos ensinavam a conta e mandavam fazer na mão. A conta foi conferida contra o exemplo do artigo; roda no navegador e nada é enviado.

### Performance e higiene
- [x] **Peso e cache** — o logo tinha 186 KB exibido a 36px e o favicon 30 KB: −185 KB por carregamento (−88%). Cache immutable ligado no `vercel.json`, com `ads.txt`, RSS e sitemap protegidos.
- [x] **Lote de correções pequenas** ✅ RSS não publica mais URL com barra final (era outra URL para a mesma página, justo no canal que agregadores citam) e `color-scheme` passou a seguir o tema — barra de rolagem e campos de formulário deixaram de destoar, o que passou a importar com o formulário de e-mail e a calculadora.
- [x] **Auto-hospedar as fontes — medido e descartado.** O ganho real ficou entre 8 e 20 ms (a folha do Google tem 1,2 KB e chega muito antes da primeira pintura), o que não paga 77 KB no repositório. Decisão tomada com número, não com palpite.

### Dívida técnica do app
- [x] **Zero testes automatizados** — 265 testes no runner nativo do Node, sem dependência nova, cobrindo parser de dinheiro, datas em 4 fusos, regra de premium e conversão de moeda. Provados por mutação: 6 bugs injetados de propósito, todos pegos. Rodar: `npm test`.
- [x] **Acessibilidade — varredura completa.** Auditoria com Chrome real: 7.778 elementos em 26 páginas × 2 temas, zero reprovação AA no fim. Corrigidos contraste sistêmico do texto secundário, borda de campo (1,3:1), o link "pular para o conteúdo" que não funcionava no Safari, ordem do Tab no celular e o nome acessível do logo. Mais suporte a quem pede menos movimento.

---

## 👤 Só você consegue

### Decisões que destravam a IA
- [ ] **Planilha de verdade no Google Sheets.** O artigo se chama "modelo grátis" e avisa honestamente que não há arquivo — quem busca essa palavra quer o arquivo. A IA entrega a estrutura pronta; você cria e torna público.
- [ ] **Provedor de e-mail.** A captura grava no banco, mas **nada envia e-mail ainda**. A IA já tirou a promessa de periodicidade do formulário (agora diz "avisamos quando sai um guia novo", que é verdade e não cria dívida). Falta escolher o provedor para os e-mails realmente saírem — sem isso a lista cresce e ninguém recebe nada.
- [ ] **Autoria com pessoa real.** Hoje é "Equipe Paca Finance", sem nome nem rosto. Em finanças pessoais, é a dimensão de credibilidade que mais pesa — e o Google cobra.
- [ ] **Prova social.** Nenhum depoimento ou número no site; o botão pede para criar conta num app que a pessoa nunca ouviu falar.

### Contas e configuração
- [x] `#6` **Desligar "Confirm email"** — feito, verificado pela API do Supabase e issue fechada no GitHub.
- [ ] **Search Console + Bing** e submeter `https://blog.pacafinance.com.br/sitemap-index.xml`. Sem isso, nada do que fizermos tem número para comparar.
- [ ] **Tag de medição (Caju) e Meta Pixel** — pontos de inserção já marcados no `BaseLayout`. Me passe os snippets.
- [ ] `#3` `#4` **Login Google e Apple (web)** — consent screen, OAuth client, Service ID.
- [ ] `#7` `#8` **RevenueCat + produtos de assinatura nas lojas** (mensal R$ 24,90 / anual R$ 179,90, trial 7 dias).
- [ ] `#20` **Teto de gasto no Gemini** (billing budget no Google Cloud).
- [ ] `#14` **Popular `partner_offers`** — a aba Recomendações fica vazia até ter dados reais.
- [ ] `#13` **RevenueCat → Meta CAPI** (atribuição server-side).
- [ ] 🔐 **Rotacionar `REVENUECAT_WEBHOOK_SECRET`** — o valor esteve no histórico do git.
- [ ] `#21` **Submissão nas lojas** — screenshots (iPhone 6.7" + **iPad 13" obrigatório**), listing, demo account, formulários de privacidade. Ver `SUBMISSION.md`.

### Mobile — precisam de dev build
- [ ] `#9` **RevenueCat**: instalar `react-native-purchases` e ligar o `billing.ts` (hoje é stub).
- [ ] `#10` **Push**: instalar `expo-notifications` e capturar o token no `_layout`.
- [ ] `#5` **Login social no mobile** (o web já está pronto no código).

---

## ✅ Feito (2026-08-30 → 09-02)

- **Auditoria de segurança e correção:** 80 falhas confirmadas e corrigidas — parser de dinheiro que corrompia valores 10× e 100×, sequestro de casal por escrita direta, vazamento de dados entre logins no sign-out, premium eterno quando o webhook falha, `check-budgets` sem autenticação, e a FK que impedia deletar a conta de quem criou o casal. Depois, uma revisão adversarial encontrou e corrigiu regressões das próprias correções (reembolso descartado pelo webhook, quota cobrada em save que falhou).
- **Blog do zero:** 11 artigos pt-BR pesquisados por palavra-chave, redesenhado no padrão editorial de NerdWallet/Nubank (sem emoji), capa única por artigo, diagramas dentro dos textos, card de compartilhamento por artigo, no ar em domínio próprio com HTTPS.
- **Captura de e-mail LGPD:** tabela isolada sem policy nenhuma, consentimento registrado, descadastro por token, honeypot e limite por IP. Auditada de forma adversarial (achou e corrigiu um furo que permitia gravar lead de qualquer site).
- **Bug achado e corrigido em produção:** os 12 diagramas dos artigos renderizavam quebrados — linha em branco dentro do SVG encerra o bloco HTML no markdown, e o parser reabria o resto embrulhando em `<p>`. Como o texto alternativo seguia intacto, leitor de tela lia certo e o problema não aparecia no código.
- **Infra:** repositório transferido para `MariaEduardaaf`, domínio `pacafinance.com.br` na Cloudflare com DNSSEC removido na ordem segura, blog deployando automático da branch.

---

## ⚠️ Riscos

- **Banco 11 migrations atrás do código.** É o item que mais custa caro se esquecido: parte do código novo assume estrutura que ainda não existe em produção.
- **Nada envia e-mail**, mas o site promete newsletter semanal. Ou liga o provedor, ou muda a promessa.
- **Zero testes automatizados** num produto financeiro que acabou de sofrer mudança grande de lógica.
- **Branch `feat/hardening-and-blog` está 20 commits à frente do `main`** e é dela que o blog deploya. Não mergear antes de aplicar as migrations, senão o código novo do app vai ao ar sem o banco correspondente.
- **iPad obrigatório:** `supportsTablet: true` torna os screenshots 2048×2732 obrigatórios na App Store.

---

## Apêndice — runbooks

Deploy do banco e das funções: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
Estratégia de monetização por conteúdo: [`docs/arbitragem/`](docs/arbitragem/).
Submissão nas lojas: [`SUBMISSION.md`](SUBMISSION.md).
