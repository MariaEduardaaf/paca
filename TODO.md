# Paca Finance — TODO (board vivo)

> **Fonte de verdade:** STATUS = código (verificado **2026-08-31**, typecheck verde nas 5 packages) · ESCOPO + `#número` = **GitHub Issues** (`madualvesfr/paca`) · DOCS = hipóteses. Em conflito, o código vence.
> **Legenda:** `#NN` = GitHub Issue · `(untracked)` = sem issue · ✅ Done · 🟡 In Progress · ⛔ Blocked.
> Atualizado **2026-08-31** (branch `feat/hardening-and-blog`). Substitui o TODO de 2026-06-27.

## Estado em uma frase
Código construído, **auditado (80 falhas confirmadas e corrigidas em 2026-08-31)** e com typecheck verde — web pronto, backend (8 edge functions) e DB (22 migrations aplicadas + **8 novas 00023–00030 pendentes de aplicar**), **blog SEO novo em `apps/blog`** pronto pra deploy; falta glue nativo do mobile (RevenueCat, push token, login social) e trabalho operacional (migrations novas, secrets, lojas) — ver ⛔.

## Hardening 2026-08-31 (auditoria multi-agente → 80 correções)
- **Dinheiro:** parser único `parseMoneyInput`/`centsToInput` em `@paca/shared` (antes: 2 convenções incompatíveis corrompiam valores 10x/100x em Budget/Bills/Transactions/Advisor web+mobile); somas nunca misturam moedas (breakdown por moeda quando auto-convert off); datas locais (`getTodayLocal`) em vez de UTC.
- **Segurança DB (migrations 00023–00030, NÃO aplicadas ainda):** RPCs `create_couple`/`join_couple_with_code` (o join antigo estava QUEBRADO por RLS e o vínculo de casal era sequestrável via update direto de `profiles.couple_id` — agora bloqueado); `search_path` pinado em todas as SECURITY DEFINER; `usage_stats`/`partner_offer_clicks` com checagem de casal; colunas imutáveis em `couples`; tabela `admin_users`; FK `created_by` corrigida (deleção de conta do criador do casal FALHAVA); idioma do signup vem do device.
- **Edge functions:** `check-budgets` agora exige `CRON_SECRET` (fail-closed) + dedup de alertas; quota com expiração de premium espelhada (webhook perdido não deixa premium eterno, 24h de graça); multi-moeda forçada server-side pra free; uso aguardado antes da resposta; webhook RevenueCat com comparação constant-time + ordenação de eventos; validação/clamp da saída do Gemini; limite de imagem 10MB; `translate-category` com teto mensal.
- **Apps:** sign-out limpa cache (dados do usuário anterior não vazam); erros de mutação tratados com toast/alert (web+mobile); dark mode persistido (web) e tab bar mobile no tema; 402 de quota mostra paywall (não "erro de imagem"); scan em lote com retry sem duplicar; usuário sem casal roteia pro onboarding (mobile); locale do device na 1ª execução; PDF/CSV export localizados + escape anti-injeção; a11y labels nos arquivos tocados.
- Relatórios completos: auditoria e correções nos scratchpads da sessão; typecheck 7/7 verde pós-tudo.

## Blog (novo, 2026-08-31) — `apps/blog`
- **Astro 5 estático** (zero JS de cliente além do toggle de tema), marca Paca (rosa/Bricolage/DM Sans), claro+escuro.
- **11 posts pt-BR** (10 artigos SEO ~2.000 palavras + boas-vindas), pesquisados por keyword (Serasa/IBGE citados com fonte, sem estatística inventada), pilar `como-dividir-contas-casal` + cluster interno, CTAs pro app.
- SEO completo: sitemap, RSS, canonical, OG (imagem 1200×630 gerada — fonte em `og-image-source.html`), JSON-LD (BlogPosting, BreadcrumbList, FAQPage), robots.txt, 5 categorias, /sobre E-E-A-T.
- `vercel.json` pronto (novo projeto Vercel apontando pra `apps/blog`). **Domínio é placeholder** (`blog.pacafinance.com`) em `astro.config.mjs`/`consts.ts`/`robots.txt` — trocar quando decidir o real.

## Bandas (rubrica: subsistema **Done** = ligado ponta-a-ponta no código, sem stub)
- **Construído: 4/5 subsistemas de código Done** — `web` ✅, `packages (api+shared)` ✅, `backend/edge-functions` ✅, `db/migrations` ✅.
- **`mobile` = built-not-fully-wired** 🟡 — todas as telas/UI prontas e typecheck verde; faltam 3 integrações nativas (`#9` billing, `#10` push token, `#5` login social).
- **Lançamento na loja = blocked-on-infra** — contas/assets/forms + config de provedores externos. Web já deploya do `main` (Vercel).

## Testes (matriz)
| Runner | Resultado |
|---|---|
| `npm run typecheck` (turbo, 4 pkgs) | ✅ **PASSED** — 6/6 tasks, 12.3s, zero erros |
| `lint` | ⚪ sem config (`echo` stub nas 4 packages) |
| testes unit/integração | ⚪ **inexistentes** (sem jest/vitest, zero `*.test/*.spec`) |
| edge functions (Deno) | ◻︎ não rodável local (deno ausente) — verificado estaticamente (file:line) |

---

## Board

### ✅ Done (verificado no código / merged na `main`)
- **App core (web + mobile):** Dashboard, Transações (filtros + export PDF), Orçamento, Contas (bills), Perfil, Scan (recibo + extrato), Advisor — todos ligados; typecheck verde.
- **Monetização (M1–M4) — código** `#22` (PR #2 merged): tabela `subscriptions` (RLS SELECT-only + `is_premium` gerado + trigger auto-free + realtime), quota por casal (10 scans + 3 advisor/mês, bypass Premium → 402), PaywallModal + gates (scan/advisor/multimoeda), webhook RevenueCat (verifica secret, idempotente), aba Recomendações (web + mobile) com badge "Parceria paga" + log de clique + regra de crédito (esconde se saldo do mês < 0).
- **Backend / edge functions (8):** `scan-receipt`, `scan-statement`, `advise-purchase` (Gemini 2.5 Flash + quota + rate-limit), `check-budgets` (já faz **push** via `notifyAndPush`), `revenuecat-webhook`, `translate-category` (rate-limit), `delete-account` (cascade real), `generate-invite`.
- **DB:** 22 migrations (`00001`→`00022`) — inclui `subscriptions`, `partner_offers`/`partner_offer_clicks`, `push_tokens`, índice de quota.
- **i18n:** 4 locales (EN/PT/RU/UK), **403 keys cada, key-complete**.
- **Login social — web** (`#3`/`#4` config à parte): botões Google/Apple ligados ao `signInWithOAuth`.
- **Readiness:** reset de senha, deleção de conta in-app, páginas legais (privacy/terms/support no Vercel), privacy manifest (sem CrashData), iPad (`ScreenContainer` + `supportsTablet:true`).
- **Tech-debt fechado (merged):** `#19` rate-limit translate-category (PR #28) · `#16` email real no perfil (PR #24) · `#15` copy delete-account (PR #23) · `#18` `R$` no scan.tsx → `formatCurrency` (PR #26) · `#12` i18n das mensagens de push (PR #27) · `#17` 1ª passada de a11y labels (PR #25).

### 🟡 In Progress / falta glue (código)
- [ ] `#9` **Billing RevenueCat** — `apps/mobile/lib/billing.ts` é **stub** (`purchaseSubscription`/`restorePurchases` dão `throw BILLING_NOT_WIRED`). Instalar `react-native-purchases`, dev build, configurar RC com `appUserID = coupleId` + `purchasePackage`.
- [ ] `#10` **Push (cliente mobile)** — `app/_layout.tsx` **não** pede permissão nem chama `getExpoPushTokenAsync()` → `useUpdatePushToken()` (hook já pronto no `@paca/api`). Instalar `expo-notifications`.
- [ ] `#5` **Login social mobile** — telas `(auth)/login|signup` só têm email+senha. Fluxo OAuth com `expo-web-browser`/`expo-auth-session` (web já pronto).
- [ ] `(untracked)` **a11y — sweep completo** — 1ª passada merged (`#17`/PR #25, ~24 labels). Muitos botões só-ícone (chevrons, toggles, share) ainda sem `accessibilityLabel` (~175 alvo).
- [ ] `(untracked)` 🧪 **Cobertura de testes** — não há testes no repo (só typecheck). Priorizar o que é financeiro/sensível: quota por casal (`_shared/quota.ts`), RLS de `subscriptions`/`usage_stats`, cálculo de saldo + conversão multimoeda, idempotência do `revenuecat-webhook`. Runner sugerido: **Vitest** (packages + web) e **`deno test`** (edge functions). *(ver ⚠️ Riscos)*

### ⛔ Blocked (infra/config externa — não é código)
- [ ] `(untracked)` 🆕 **Aplicar migrations 00023–00030** no Supabase (`db push` ou SQL Editor, em ordem) e **depois** redeployar as edge functions atualizadas (`generate-invite`, `check-budgets`, `scan-receipt`, `scan-statement`, `advise-purchase`, `revenuecat-webhook`, `translate-category`) e o web. **Ordem importa** — runbook completo em `supabase/RUNBOOK.md`; resumo: migrations → functions → clients. 00025 fecha o sequestro de casal (clientes antigos de create/join param — nenhum foi shipado, então sem impacto).
- [ ] `(untracked)` 🆕 **Setar `CRON_SECRET`** nos secrets das functions + configurar o scheduler do `check-budgets` com header `Authorization: Bearer <CRON_SECRET>` (função responde 503 até existir o secret — proposital).
- [ ] `(untracked)` 🆕 **Seed do admin**: após 00028, `insert into admin_users (user_id) select id from auth.users where email = '<seu email>';` (dashboard admin fica vazio até isso).
- [ ] `(untracked)` 🆕 **Deploy do blog**: criar projeto Vercel apontando pra `apps/blog` (config já em `apps/blog/vercel.json`), escolher domínio real e trocar o placeholder em `astro.config.mjs` + `src/consts.ts` + `public/robots.txt`; depois Google Search Console + submeter sitemap.
- [ ] `#6` **Desligar "Confirm email"** no Supabase (senão signup não loga). Auth → Providers → Email.
- [ ] `#3` **Config login Google (web)** — consent screen + OAuth client + colar Client ID/Secret no Supabase. *(sem isso, o botão chama `signInWithOAuth` e o Supabase retorna erro)*
- [ ] `#4` **Config login Apple (web)** — Service ID + chave no Apple Developer.
- [ ] `#7` **RevenueCat** — conta + produtos (mensal R$ 24,90 / anual R$ 179,90, trial 7d) + entitlement `premium` + webhook (secret).
- [ ] `#8` **Produtos de assinatura nas lojas** (App Store Connect + Play).
- [ ] `#11` **Agendar `check-budgets`** (pg_cron ou Scheduled Function) — verificado: **não há cron** nas migrations; hoje não dispara sozinho.
- [ ] `#13` **RevenueCat → Meta CAPI** (atribuição server-side, M2 — sem SDK no app).
- [ ] `#14` **Popular `partner_offers`** com parceiros reais + URLs de afiliado (template de INSERT na migration `00020`). Aba fica vazia até ter dados.
- [ ] `#20` **Teto de gasto no Gemini** (billing budget no Google Cloud).
- [ ] `#21` **Submissão nas lojas** — screenshots (iPhone 6.7" + **iPad 13" obrigatório**), listing copy (PT+EN pronta), demo account, privacy forms (Apple App Privacy + Google Data Safety). Ver `SUBMISSION.md`.
- [ ] `(untracked)` **Aplicar enum no Supabase:** `alter type usage_action add value if not exists 'translate';` (migration `00022`) — para metering do `translate-category`. A tradução funciona sem (o log em `usage_stats` é fire-and-forget).
- [ ] `(untracked)` 🔐 **Rotacionar `REVENUECAT_WEBHOOK_SECRET`** — o valor está no histórico do git (TODO antigo). Gerar novo no RevenueCat → `supabase secrets set REVENUECAT_WEBHOOK_SECRET=… --project-ref gtumyiwokhroizmqcbve` → atualizar o header **Authorization** do webhook no dashboard do RevenueCat. *(ver ⚠️ Riscos)*

### 🗄️ Adiado / backlog (seção extra — não-kanban)
- [ ] Onboarding tour — adiado.
- [ ] PWA / Offline support — adiado.
- [ ] Push "parceiro adicionou transação" (trigger) — opcional.
- [ ] Crash reporting (Sentry) — OU manter sem (manifest já sem `CrashData`).
- [ ] Analytics básico (eventos-chave).

---

## ⚠️ Riscos
- **Zero testes automatizados** num app pré-loja com dados financeiros: typecheck não pega regressão de lógica. Risco alto para um app de dinheiro — vale ao menos cobrir quota/RLS/cálculo de saldo.
- 🔐 **Secret no histórico do git:** o TODO antigo trazia o **valor** do `REVENUECAT_WEBHOOK_SECRET` em texto (commitado). Foi **removido** deste arquivo, mas continua no histórico → **rotacionar** o secret no RevenueCat **e** no `supabase secrets`.
- **Login social web dá erro até configurar provedores** (`#3`/`#4`/`#6`): `signInWithOAuth` sem tratamento de erro de provider não-configurado.
- **`check-budgets` órfão** (`#11`): alertas de orçamento (80%/100%) não disparam sozinhos sem agendamento.
- **iPad obrigatório:** `supportsTablet:true` → screenshots **2048×2732 são MANDATÓRIOS** na App Store (`#21`).

## 🧭 Ordem que destrava o lançamento
1. **Supabase config** — desligar "Confirm email" (`#6`) + provedores Google/Apple web (`#3`/`#4`). Libera login/teste do web hoje.
2. **DB pendente** — aplicar enum `00022` + agendar `check-budgets` (`#11`).
3. **Assinatura real** — RevenueCat conta+produtos+webhook (`#7`) + produtos nas lojas (`#8`).
4. **Mobile dev build** — instalar `react-native-purchases` + `expo-notifications` → wire `billing.ts` (`#9`) + push token (`#10`) + login social (`#5`).
5. **Submissão** — screenshots (iPhone+iPad) + listing + demo account + privacy forms (`#21`, ver `SUBMISSION.md`).

---

## Apêndice — Runbooks operacionais (detalhe preservado do TODO anterior)

### Login Google (web)
- Google Cloud (projeto **paca** = ID `gen-lang-client-0168316998`): consent screen (External) + criar **OAuth client (Web)** com redirect URI `https://gtumyiwokhroizmqcbve.supabase.co/auth/v1/callback` → copiar Client ID/Secret.
- Supabase → Auth → Providers → **Google**: Enable + colar Client ID/Secret.
- Supabase → Auth → **URL Configuration** → Redirect URLs: adicionar `http://localhost:5173` (+ domínio de prod depois).
- Adicionar o e-mail de teste em **Audience → Test users** (app fica em "Testing").

### RevenueCat + lojas (M1)
- Conta RevenueCat + linkar App Store Connect e Play.
- Produtos: mensal **R$ 24,90**, anual **R$ 179,90**, ambos **trial 7 dias**; entitlement `premium`.
- Webhook RC → URL `https://gtumyiwokhroizmqcbve.functions.supabase.co/revenuecat-webhook`, header **Authorization** = **valor do `REVENUECAT_WEBHOOK_SECRET`** (ver `supabase secrets` / gestor de segredos — **não versionar**; rotacionar, ver ⚠️ Riscos).
- Pegar **API keys do RC** (iOS/Android) pro app.

### Mobile build
- `npx expo install react-native-purchases expo-notifications` → **dev build** (não roda no Expo Go).
- **Billing:** seguir o snippet comentado em `apps/mobile/lib/billing.ts` (`appUserID: coupleId` + `purchasePackage`).
- **Push (cliente):** no `_layout`, permissão + `getExpoPushTokenAsync()` → `useUpdatePushToken()`.

### Infra / deploy (estado atual)
- Backend no ar: 22 migrations aplicadas no projeto `gtumyiwokhroizmqcbve`; edge functions deployadas (`scan-receipt`, `scan-statement`, `advise-purchase`, `check-budgets`, `revenuecat-webhook`, `translate-category`); secrets `GEMINI_API_KEY` + `REVENUECAT_WEBHOOK_SECRET` setados.
- Web deploya automático do `main` (Vercel).
