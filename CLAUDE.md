# Paca Finance — instruções do projeto

App de **finanças para casais** — controlar gastos, orçamento, contas e metas em conjunto.

## Estrutura

Monorepo **Turborepo** (npm workspaces), três apps:
- `apps/web` — React 18 + Vite + React Router 7 + Tailwind (SPA, deploy Vercel).
- `apps/mobile` — Expo 52 + React Native + Expo Router + NativeWind.
- `apps/blog` — **Astro 5 estático** (SEO pt-BR "finanças para casais"), deploy Vercel separado.

Backend: **Supabase** (Auth, Postgres + RLS, Edge Functions). Docs vivos: `README.md`, `TODO.md` (status
atual), `PLAN.md`, `supabase/RUNBOOK.md`.

Idioma: código em inglês; conteúdo do blog em pt-BR.

## Monetização por conteúdo (arbitragem de tráfego) — LER ANTES de mexer no blog

O `apps/blog` é o veículo para monetizar com anúncio + tráfego pago (comprar tráfego no Meta, monetizar
os artigos com anúncio do Google/AdX). A estratégia completa e o passo-a-passo estão em:

- **[`docs/arbitragem/ESTRATEGIA.md`](docs/arbitragem/ESTRATEGIA.md)** — o modelo, a economia (CPL < RPS),
  o funil, o reengajamento, e a **fronteira de compliance** (o que NÃO fazer).
- **[`docs/arbitragem/PLANO-DE-ACAO.md`](docs/arbitragem/PLANO-DE-ACAO.md)** — checklist concreto neste
  repositório (deploy do blog, `ads.txt`, injeção de anúncio/pixel/medição, captura de e-mail, escala).

**Regras duras desta frente (não quebrar):**
1. **Contas legítimas** (Meta/monetização no CNPJ) — nunca perfis falsos ou geo forjada.
2. **LGPD desde o 1º e-mail** — consentimento explícito p/ marketing, aviso de privacidade, descadastro.
3. **Leads do blog isolados dos dados dos usuários do app** — bases e consentimentos separados.
4. **Conteúdo honesto** — sem clickbait/promessa agressiva (mina a marca e atrai punição do Meta).
5. **Offerwall/anúncio de recompensa com moderação** — excesso faz o Meta encarecer a mídia em silêncio.
6. **Caixa:** nunca escalar a compra de mídia mais rápido do que o recebimento do anúncio financia.

Ao adicionar artigos: criar `.md` em `apps/blog/src/content/blog/` (o Astro gera rota/sitemap/RSS/JSON-LD
sozinho). Categoria nova exige editar `apps/blog/src/content.config.ts` **e** `apps/blog/src/lib/categories.ts`.
