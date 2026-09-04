# Plano de ação — ligar a monetização por conteúdo no blog do Paca

> Passos concretos, específicos deste repositório, para transformar o `apps/blog` em veículo de
> arbitragem de tráfego. Estratégia e o "porquê" estão em [`ESTRATEGIA.md`](./ESTRATEGIA.md).
> Este é um checklist de execução — a IA do projeto pode seguir em ordem.

## Estado atual do blog (medido em 2026-09-01)

- `apps/blog` = **Astro 5 estático**, deploy Vercel (projeto separado, `apps/blog/vercel.json`).
- **11 artigos** pt-BR em `apps/blog/src/content/blog/*.md` (file-based, Astro Content Collections).
- SEO completo: JSON-LD (BlogPosting/FAQ/Breadcrumb), sitemap, RSS, OG, TOC — em `BaseLayout.astro` e
  `BlogPostLayout.astro`.
- **5 categorias fixas** (enum) em `apps/blog/src/content.config.ts` + `apps/blog/src/lib/categories.ts`.
- ⚠️ **Faltando:** anúncio, pixel/analytics, captura de e-mail, `ads.txt`. Blog **não deployado**,
  domínio placeholder `blog.pacafinance.com`, vive na branch `feat/hardening-and-blog` (não em `main`).

---

## Fase 0 — Fundação

- [ ] **Definir domínio real** do blog e trocar o placeholder `blog.pacafinance.com` em 3 lugares:
      `apps/blog/astro.config.mjs`, `apps/blog/src/consts.ts`, `apps/blog/public/robots.txt`.
- [ ] **Deployar o blog** na Vercel (o `vercel.json` já existe). Sem site no ar, nada roda.
- [ ] **Escolher a monetização:**
  - **AdSense** — rápido de aprovar, bom para começar. Requer conteúdo original (o blog tem).
  - **AdSeleto** (`adseleto.com`) — parceira Google AdX/Amazon/Media.net; mais receita, dá acesso a
    formatos de recompensa (offerwall/rewarded). Assume o `MANAGERDOMAIN` do `ads.txt`. Recomendada
    quando houver tráfego.
- [ ] **Criar `apps/blog/public/ads.txt`** com o publisher id da rede escolhida (obrigatório pra receber).

## Fase 1 — Instrumentar (medir e monetizar), 1 blog

- [ ] **Instalar a medição** (a tag "Caju" que a dona construiu) no `<head>` — via o `<slot name="head"
      />` de `apps/blog/src/layouts/BaseLayout.astro`. É o placar (RPS, receita por sessão/origem).
- [ ] **Meta Pixel + CAPI** — pixel no `<head>`; CAPI (server-side) para devolver a receita real ao Meta
      como evento de valor, e otimizar por quem gera receita (não pelo clique mais barato).
- [ ] **Injetar anúncios:**
  - script da rede no `<head>` do `BaseLayout.astro`;
  - bloco de anúncio no corpo do artigo, em `apps/blog/src/layouts/BlogPostLayout.astro`, no ponto
    natural **entre `<Content />` e a `CTABox`**;
  - 1 anúncio na **primeira dobra** (junto do título) — é o de maior valor.
  - Priorizar **formato de recompensa** (offerwall/rewarded) se a rede oferecer; display no conteúdo como base.
- [ ] **Captura de e-mail** com **consentimento explícito** (LGPD): checkbox de opt-in p/ marketing +
      link pro aviso de privacidade. Guardar consentimento, prever descadastro. (Pode usar o Supabase que
      o app já tem, numa tabela própria de leads do blog, isolada dos dados do app.)
- [ ] **Escalar conteúdo:** de 11 para dezenas de artigos dos ângulos de maior valor — crédito, sair das
      dívidas, score, cartão, planilha de gastos, "melhor app de finanças pra casal", renda extra. Cada
      artigo é um `.md` novo em `src/content/blog/` (o Astro gera rota, sitemap, RSS, JSON-LD sozinho).
      ⚠️ Se precisar de categoria nova, editar o enum em `content.config.ts` **e** `lib/categories.ts`.

## Fase 2 — Ligar o tráfego e achar o ponto positivo

- [ ] **Conta de Meta Ads legítima** (BM + conta de anúncio no CNPJ). Nunca perfis falsos.
- [ ] **Primeiras campanhas** (começar pequeno, ~R$ 250/dia total): 1 campanha → 1 conjunto → até 10
      criativos; **máx. 4 anúncios ativos por conjunto**.
- [ ] **UTM canônico** em todo link, separando tráfego de campanha do de reengajamento:
      `?utm_source=[campanha|email]&utm_campaign=[artigo]&utm_content=[criativo/ordem]`.
- [ ] **Ritmo:** 48h coletando sem mexer → otimizar → +24h confirmando → escalar vencedores até ~R$
      100/dia por conjunto.
- [ ] **Medir o RPS real** do blog (é o número que decide tudo). Semáforo: 🟢 CPL ≤ RPS · 🟡 até RPS×1,30
      · 🔴 acima → pausar.
- [ ] **Ligar o reengajamento** (e-mail) e medir o retorno dele **separado** do tráfego pago.

## Fase 3 — Escalar

- [ ] Aumentar orçamento nos criativos vencedores; lateralizar (duplicar conjuntos que funcionam).
- [ ] Mais artigos, mais ângulos; replicar o que deu certo.
- [ ] Só então considerar push do app mobile como canal extra de reengajamento.

---

## Guardrails (não esquecer)

- **Caixa:** paga-se o Meta à vista e recebe-se do anúncio ~30 dias depois. **Nunca escalar a mídia mais
  rápido do que o recebimento financia** — é o erro que quebra operação lucrativa no papel. Comece
  pequeno.
- **Compliance:** contas legítimas; LGPD desde o 1º e-mail; conteúdo honesto; offerwall com moderação
  (offerwall pesado faz o Meta encarecer a sua mídia em silêncio). Ver [`ESTRATEGIA.md`](./ESTRATEGIA.md)
  §7.
- **Isolamento de dados:** os leads/e-mails do blog devem ficar **separados** dos dados dos usuários do
  app (não misturar bases; consentimentos são diferentes).
