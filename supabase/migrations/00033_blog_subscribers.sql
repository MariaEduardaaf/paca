-- Captura de e-mail do blog (arbitragem de tráfego) — base de leads ISOLADA.
--
-- O que resolve: a estratégia de tráfego pago (docs/arbitragem/ESTRATEGIA.md
-- seção 6) depende de reengajar por e-mail o leitor que chegou pelo anúncio.
-- Hoje não existe onde guardar esse lead. Esta tabela cria essa base — e cria
-- com as duas garantias que o projeto exige desde o primeiro e-mail:
--
-- 1) LGPD: o opt-in de marketing é registrado como DADO (consent_marketing +
--    consent_at), não presumido. O descadastro é um token opaco por assinante
--    (unsubscribe_token), então o link de "cancelar inscrição" funciona no dia
--    1 e sem login. unsubscribed_at guarda a baixa sem apagar a prova do
--    consentimento anterior (defesa em caso de reclamação).
--
-- 2) ISOLAMENTO leads x usuários do app: NÃO há FK para profiles/auth.users e
--    NÃO há NENHUMA policy de RLS. Com RLS habilitada e zero policies, anon e
--    authenticated não leem nem escrevem NADA aqui — nem o dono da conta, nem
--    um usuário logado do app, nem o admin do dashboard. O único acesso é o
--    service_role usado pelas edge functions blog-subscribe/blog-unsubscribe.
--    Isso é intencional: a base de marketing do blog não se mistura com os
--    dados financeiros dos usuários. Os GRANTs default do Supabase (anon,
--    authenticated) são revogados explicitamente como segunda camada.
--
-- Normalização: e-mail é sempre gravado em minúsculas (CHECK garante no banco)
-- e a unicidade é um índice único sobre lower(email) — "Ana@X.com" e
-- "ana@x.com" são o mesmo assinante, uma linha só. A re-inscrição é um UPDATE
-- feito pela edge function (nunca uma segunda linha).
--
-- Idempotente: CREATE TABLE/INDEX IF NOT EXISTS; o bloco DO remove qualquer
-- policy que tenha sido criada por engano, reafirmando o invariante "sem
-- policy" a cada aplicação. Seguro de rodar no banco vivo (tabela nova, não
-- toca nada existente).
--
-- Rollback: drop table if exists public.blog_subscribers cascade;

create table if not exists blog_subscribers (
  id uuid primary key default gen_random_uuid(),
  -- Sempre minúsculo: a edge function normaliza e o CHECK impede regressão,
  -- de forma que filtrar por `email = <normalizado>` equivale a lower(email).
  email text not null
    constraint blog_subscribers_email_key unique
    constraint blog_subscribers_email_lowercase_ck check (email = lower(email))
    constraint blog_subscribers_email_length_ck check (char_length(email) between 3 and 254),
  -- Registro de que houve opt-in explícito de marketing (checkbox marcado pelo
  -- leitor, nunca pré-marcado). Sem true aqui não se envia e-mail de marketing.
  consent_marketing boolean not null,
  consent_at timestamptz not null default now(),
  -- Slug do artigo de origem: mede qual conteúdo converte (CPL x RPS).
  source_slug text,
  -- Segredo por assinante que autentica o link de descadastro (sem login).
  unsubscribe_token uuid not null default gen_random_uuid(),
  -- NULL = inscrito. Preenchido = descadastrado (mantemos a linha e o
  -- consent_at original como prova/histórico; supressão, não exclusão).
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Unicidade case-insensitive: um e-mail = um assinante, mesmo se o CHECK de
-- minúsculas for afrouxado um dia.
create unique index if not exists blog_subscribers_email_lower_key
  on blog_subscribers (lower(email));
-- A UNIQUE simples em `email` (na definição da tabela) existe além do índice
-- funcional acima por um motivo prático: o upsert de re-inscrição da edge
-- function precisa de `ON CONFLICT (email)`, que o PostgREST só sabe emitir
-- sobre uma constraint de COLUNA — um índice sobre lower(email) não serve como
-- alvo. Com o CHECK de minúsculas as duas são equivalentes na prática; a
-- funcional é a garantia, a simples é o alvo do upsert e o índice de busca.

-- Índice de consulta do descadastro: a blog-unsubscribe busca só por token.
-- Único também porque o token é a credencial do link (colisão = descadastrar
-- o assinante errado).
create unique index if not exists blog_subscribers_unsubscribe_token_key
  on blog_subscribers (unsubscribe_token);

alter table blog_subscribers enable row level security;

-- Invariante de isolamento: NENHUMA policy. RLS habilitada + zero policies =
-- anon/authenticated não enxergam uma linha sequer; só service_role (que
-- bypassa RLS) escreve e lê, a partir das edge functions. Se alguém adicionar
-- uma policy no futuro, esta migration a remove ao ser reaplicada — e isso é
-- de propósito.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'blog_subscribers'
  loop
    execute format('drop policy %I on public.blog_subscribers', pol.policyname);
  end loop;
end $$;

-- Segunda camada: revoga os GRANTs default do Supabase para os papéis de
-- cliente. Mesmo que uma policy apareça por engano, sem GRANT não há acesso.
-- `public` entra na lista porque é o papel do qual TODO papel herda: um GRANT
-- para public (feito por engano por uma migration futura ou por ferramenta de
-- seed) devolveria acesso a anon/authenticated mesmo com os revokes nominais
-- acima. Revogar de public fecha essa porta de trás.
revoke all on table blog_subscribers from public, anon, authenticated;

comment on table blog_subscribers is
  'Leads de e-mail capturados no blog (marketing). Base ISOLADA dos usuários do app: sem FK para profiles/auth.users, RLS habilitada SEM policies e GRANTs revogados de anon/authenticated — acesso apenas via service_role nas edge functions blog-subscribe/blog-unsubscribe.';
comment on column blog_subscribers.consent_marketing is
  'LGPD: opt-in explícito e específico para marketing, marcado pelo leitor (checkbox nunca pré-marcado).';
comment on column blog_subscribers.unsubscribe_token is
  'Credencial opaca do link de descadastro (GET blog-unsubscribe?token=...). Nunca exibir em listagens.';
comment on column blog_subscribers.unsubscribed_at is
  'NULL = inscrito. Preenchido = descadastrado; a linha é mantida como supressão e prova do consentimento anterior.';
