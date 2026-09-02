-- =====================================================================
-- APLICAR TUDO — migrations 00023 a 00033, na ordem, num arquivo só.
--
-- Gerado para colar de uma vez no SQL Editor do Supabase. É exatamente o
-- conteúdo dos 11 arquivos de supabase/migrations/, concatenados na ordem
-- correta — nada foi reescrito.
--
-- SEGURO DE RODAR MAIS DE UMA VEZ: todas são idempotentes (CREATE OR REPLACE,
-- IF NOT EXISTS, DROP POLICY IF EXISTS antes de criar). Se der erro no meio,
-- corrija e rode tudo de novo sem medo.
--
-- A ÚNICA QUE MUDA COMPORTAMENTO É A 00025: ela impede o cliente de escrever
-- profiles.couple_id direto. Depois dela, criar/entrar em casal só funciona
-- pelas RPCs (que a 00024 cria) — por isso o redeploy das edge functions
-- precisa vir logo em seguida. Detalhes em supabase/RUNBOOK.md.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 00023_pin_security_definer_search_path.sql
-- ---------------------------------------------------------------------
-- Hardening: pin search_path on the existing SECURITY DEFINER functions.
--
-- What it fixes (audit ids 16, 17): get_my_couple_id() — the function every
-- tenant-isolation RLS policy depends on — and the
-- create_free_subscription_for_couple() trigger both run as their definer with
-- an UNPINNED search_path and unqualified table names. If name resolution were
-- ever redirected (an object shadowing `profiles`/`subscriptions` earlier on a
-- caller-controlled path), tenant isolation / the entitlement table could be
-- compromised. Migration 00005 already pinned handle_new_user for exactly this
-- reason; this applies the same hardening to the remaining definer functions.
--
-- Additive/idempotent: CREATE OR REPLACE only; bodies are behavior-identical,
-- just schema-qualified. Safe on the live DB.
--
-- Rollback: re-run the original definitions from 00001 (get_my_couple_id) and
-- 00018 (create_free_subscription_for_couple) — i.e. CREATE OR REPLACE without
-- the SET search_path clause. Not recommended.

create or replace function get_my_couple_id()
returns uuid as $$
  select couple_id from public.profiles where user_id = auth.uid()
$$ language sql security definer stable set search_path = public, pg_temp;

create or replace function create_free_subscription_for_couple()
returns trigger as $$
begin
  insert into public.subscriptions (couple_id) values (new.id)
    on conflict (couple_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;


-- ---------------------------------------------------------------------
-- 00024_couple_rpcs.sql
-- ---------------------------------------------------------------------
-- Server-side couple creation + invite join (audit id 14, enabler for id 13).
--
-- What it fixes: the couples SELECT policy is members-only
-- (`id = get_my_couple_id()`), so a not-yet-paired user (couple_id IS NULL)
-- can never resolve an invite code client-side — `select id from couples where
-- invite_code = ...` always returns 0 rows and the legitimate join flow fails.
-- The only path that "worked" was the raw client write of profiles.couple_id,
-- which is the exact hole 00025 closes. These SECURITY DEFINER RPCs move the
-- invite lookup and the membership write server-side, where the code is
-- actually validated. The couples SELECT policy intentionally stays
-- members-only (a broad SELECT would leak every couple).
--
--   create_couple(p_name text default null) returns jsonb
--     -> {"couple_id": <uuid>, "invite_code": <text>}
--     p_name is accepted for forward-compatibility; couples has no name column
--     today, so it is currently ignored.
--   join_couple_with_code(p_code text) returns uuid  -- the joined couple_id
--
-- Invite codes: 'PACA-' + 10 chars from an unambiguous 32-char alphabet
-- (~50 bits of entropy), generated from gen_random_uuid() bytes (pg_catalog,
-- resolvable under the pinned search_path; the fully-random uuid bytes are
-- used, skipping the version/variant bytes). Existing 'PACA-XXXX' codes keep
-- working for join.
--
-- Race safety: both RPCs lock the caller's profile row FOR UPDATE before
-- checking couple_id; join also locks the target couple row FOR UPDATE so two
-- concurrent joiners serialize and the second one sees the couple full.
--
-- Errors are raised with stable message tokens for the clients to map to i18n:
--   PROFILE_NOT_FOUND, ALREADY_IN_COUPLE, INVALID_CODE, COUPLE_FULL.
--
-- Idempotent: CREATE OR REPLACE. Additive — no existing object is altered.
-- Rollback: drop function create_couple(text); drop function
-- join_couple_with_code(text); drop function generate_couple_invite_code();
-- (clients then fall back to the legacy flows, which 00025 blocks — roll back
-- 00025 first if you must restore the legacy join).

-- Internal helper: cryptographically-strong invite code.
create or replace function generate_couple_invite_code()
returns text as $$
declare
  -- Unambiguous alphabet (no 0/O/1/I), 32 chars => 5 bits per char.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid());
  -- uuid v4 bytes 6 (version) and 8 (variant) are partially fixed; skip them.
  v_positions constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  v_code text := 'PACA-';
  v_pos int;
begin
  foreach v_pos in array v_positions loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_pos) % 32) + 1, 1);
  end loop;
  return v_code;
end;
$$ language plpgsql volatile set search_path = public, pg_temp;

revoke all on function generate_couple_invite_code() from public, anon, authenticated;

create or replace function create_couple(p_name text default null)
returns jsonb as $$
declare
  v_profile_id uuid;
  v_couple_id uuid;
  v_existing_couple uuid;
  v_code text;
  v_attempts int := 0;
begin
  -- Lock the caller's profile so concurrent create/join calls serialize.
  select id, couple_id into v_profile_id, v_existing_couple
    from public.profiles
    where user_id = auth.uid()
    for update;

  if v_profile_id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_existing_couple is not null then
    raise exception 'ALREADY_IN_COUPLE';
  end if;

  -- p_name intentionally unused: couples has no name column yet.
  loop
    v_code := public.generate_couple_invite_code();
    begin
      insert into public.couples (invite_code, created_by)
        values (v_code, v_profile_id)
        returning id into v_couple_id;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 5 then
        raise;
      end if;
    end;
  end loop;

  update public.profiles set couple_id = v_couple_id where id = v_profile_id;

  return jsonb_build_object('couple_id', v_couple_id, 'invite_code', v_code);
end;
$$ language plpgsql security definer volatile set search_path = public, pg_temp;

create or replace function join_couple_with_code(p_code text)
returns uuid as $$
declare
  v_profile_id uuid;
  v_existing_couple uuid;
  v_couple_id uuid;
  v_members int;
begin
  -- Lock the caller's profile so concurrent create/join calls serialize.
  select id, couple_id into v_profile_id, v_existing_couple
    from public.profiles
    where user_id = auth.uid()
    for update;

  if v_profile_id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_existing_couple is not null then
    raise exception 'ALREADY_IN_COUPLE';
  end if;

  -- Lock the couple row so two concurrent joiners serialize; the second one
  -- then counts the first as a member and is rejected.
  select id into v_couple_id
    from public.couples
    where invite_code = upper(trim(p_code))
    for update;

  if v_couple_id is null then
    raise exception 'INVALID_CODE';
  end if;

  select count(*) into v_members
    from public.profiles
    where couple_id = v_couple_id;

  if v_members >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  update public.profiles set couple_id = v_couple_id where id = v_profile_id;

  return v_couple_id;
end;
$$ language plpgsql security definer volatile set search_path = public, pg_temp;

-- SECURITY DEFINER: restrict execution to signed-in users only.
revoke all on function create_couple(text) from public, anon;
revoke all on function join_couple_with_code(text) from public, anon;
grant execute on function create_couple(text) to authenticated;
grant execute on function join_couple_with_code(text) to authenticated;


-- ---------------------------------------------------------------------
-- 00025_profiles_couple_id_lockdown.sql
-- ---------------------------------------------------------------------
-- Close the couple-membership hijack: profiles.couple_id is no longer
-- client-writable (audit id 13).
--
-- What it fixes: the profiles UPDATE policy from 00001 had USING
-- (user_id = auth.uid()) and NO WITH CHECK, so Postgres reused USING as the
-- check — which pins only user_id. couple_id was therefore a raw, unvalidated
-- client write: any authenticated user could PATCH their own profile with
-- couple_id = <any existing couple uuid> and gain full read/write over that
-- couple's transactions, budgets, bills and subscription (couple uuids are not
-- secret — e.g. the RevenueCat app_user_id). The invite code was only ever
-- checked in JS.
--
-- After this migration, couple_id must remain unchanged on every client
-- UPDATE: `couple_id is not distinct from public.get_my_couple_id()`.
-- get_my_couple_id() is STABLE, so inside the UPDATE statement it evaluates
-- against the pre-statement snapshot — i.e. the OLD couple_id — making the
-- column immutable to clients. IS NOT DISTINCT FROM keeps the couple-less case
-- working (NULL stays NULL), so profile edits (display_name, language, etc.)
-- are unaffected for paired and unpaired users alike.
--
-- Joining/creating a couple now happens ONLY via the SECURITY DEFINER RPCs
-- from 00024 (create_couple / join_couple_with_code), which bypass RLS after
-- validating the invite code server-side. The delete-account edge function
-- uses the service_role key (bypasses RLS) — unaffected. No other legitimate
-- client-side writer of couple_id exists (verified: useCouple.ts and
-- onboarding.tsx legacy flows are the ones being replaced; generate-invite
-- must also switch to the RPC — see the deploy runbook).
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE.
-- Rollback: recreate the policy without the WITH CHECK clause (reopens the
-- hijack — do not do this except to unblock an emergency).

drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and couple_id is not distinct from public.get_my_couple_id()
  );


-- ---------------------------------------------------------------------
-- 00026_insert_policies_couple_check.sql
-- ---------------------------------------------------------------------
-- Constrain couple_id on client INSERTs into usage_stats and
-- partner_offer_clicks (audit ids 15, 19).
--
-- What it fixes:
-- 1) usage_stats (00010): the INSERT policy validated only profile_id, leaving
--    couple_id and action attacker-chosen. The monthly free-tier quota counts
--    usage_stats BY couple_id (quota.ts), so any user could insert forged rows
--    with a victim couple's id and action='scan_receipt'/'advise' and exhaust
--    that couple's shared monthly AI allowance (cross-tenant DoS; no DELETE
--    policy exists for the victim to clean up).
-- 2) partner_offer_clicks (00020): same pattern — click rows could be
--    attributed to any couple_id, polluting the analytics/compliance trail.
--
-- Fix: the WITH CHECK now also requires couple_id to be NULL or the caller's
-- own couple (both columns are nullable in the schema, and couple-less users
-- legitimately log with couple_id NULL). Edge functions write via service_role
-- and bypass RLS — unaffected.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE.
-- Rollback: recreate each policy with only the profile_id predicate (as in
-- 00010 / 00020).

drop policy if exists "usage_stats_insert_own" on usage_stats;

create policy "usage_stats_insert_own" on usage_stats
  for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and (couple_id is null or couple_id = public.get_my_couple_id())
  );

drop policy if exists "Users can log their own clicks" on partner_offer_clicks;

create policy "Users can log their own clicks"
  on partner_offer_clicks for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and (couple_id is null or couple_id = public.get_my_couple_id())
  );


-- ---------------------------------------------------------------------
-- 00027_couples_update_immutable_columns.sql
-- ---------------------------------------------------------------------
-- Make couples.id / invite_code / created_by immutable to members
-- (audit id 18).
--
-- What it fixes: the couples UPDATE policy from 00001 has no WITH CHECK, so
-- USING is reused — that pins only the primary key (no cross-couple pivot),
-- but every other column is member-writable: a member could rewrite
-- created_by to an arbitrary profile id or overwrite/regenerate invite_code.
-- Settings columns (primary_currency, auto_convert_currency,
-- hidden_category_ids, partner_since) stay member-editable.
--
-- RLS WITH CHECK cannot see the OLD row (and a couples-subquery inside a
-- couples policy would recurse), so column immutability is enforced with a
-- BEFORE UPDATE trigger:
--   - id and invite_code may never change (no flow, service_role included,
--     legitimately changes them);
--   - created_by may only change TO NULL — required so the
--     ON DELETE SET NULL FK action from 00017 (account deletion) keeps
--     working.
-- The UPDATE policy is also recreated with an explicit WITH CHECK
-- (id = get_my_couple_id()) to make the implicit reuse explicit.
--
-- Idempotent: CREATE OR REPLACE function, DROP TRIGGER/POLICY IF EXISTS.
-- Rollback: drop trigger couples_protect_immutable_columns on couples;
--           drop function couples_protect_immutable_columns();
--           recreate the 00001 UPDATE policy (USING only).

create or replace function couples_protect_immutable_columns()
returns trigger as $$
begin
  if new.id is distinct from old.id then
    raise exception 'IMMUTABLE_COLUMN: couples.id';
  end if;
  if new.invite_code is distinct from old.invite_code then
    raise exception 'IMMUTABLE_COLUMN: couples.invite_code';
  end if;
  -- Allow clearing only (ON DELETE SET NULL when the creator's profile goes).
  if new.created_by is distinct from old.created_by and new.created_by is not null then
    raise exception 'IMMUTABLE_COLUMN: couples.created_by';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists couples_protect_immutable_columns on couples;

create trigger couples_protect_immutable_columns
  before update on couples
  for each row execute function couples_protect_immutable_columns();

drop policy if exists "Users can update own couple" on couples;

create policy "Users can update own couple"
  on couples for update
  using (id = get_my_couple_id())
  with check (id = get_my_couple_id());


-- ---------------------------------------------------------------------
-- 00028_admins_table.sql
-- ---------------------------------------------------------------------
-- Admin authorization via an allowlist table instead of a mutable email claim
-- (audit id 20).
--
-- What it fixes: four policies granted privileged access on
-- `auth.jwt() ->> 'email' in (owner emails)` — usage_stats admin SELECT
-- (00010), all-profiles SELECT (00011), partner_offers ALL incl. WRITE of
-- affiliate URLs, and all-clicks SELECT (00020). An email claim is only as
-- trustworthy as email-confirmation enforcement at the auth layer; keying
-- WRITE access to user-visible offer URLs on it is fragile. Admin is now a
-- row in admin_users (user_id-based, immutable by clients), checked through a
-- SECURITY DEFINER is_admin() helper.
--
-- admin_users has RLS enabled with NO policies: clients can never read or
-- write it; only service_role / SQL console manages membership. is_admin() is
-- SECURITY DEFINER so the policy check itself bypasses that lockout.
--
-- Seeding: the current owner accounts are inserted by email from auth.users.
-- VERIFY AFTER APPLYING (see runbook): `select count(*) from admin_users;`
-- must be >= 1 — if the owner emails differ in prod the seed inserts nothing
-- and the admin dashboard loses access until a row is inserted manually:
--   insert into admin_users (user_id)
--     select id from auth.users where email = '<owner email>';
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS /
-- ON CONFLICT DO NOTHING.
-- Rollback: recreate the four email-claim policies from 00010/00011/00020,
-- then drop function is_admin() and table admin_users.

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
-- No policies on purpose: service_role only.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  )
$$ language sql security definer stable set search_path = public, pg_temp;

revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- Seed the current owner accounts (no-op if already present or not found).
insert into admin_users (user_id)
  select id from auth.users
  where lower(email) in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com')
  on conflict (user_id) do nothing;

-- Re-key the four admin policies on is_admin().

drop policy if exists "usage_stats_select_admin" on usage_stats;
create policy "usage_stats_select_admin" on usage_stats
  for select
  using (public.is_admin());

drop policy if exists "profiles_select_admin" on profiles;
create policy "profiles_select_admin" on profiles
  for select
  using (public.is_admin());

drop policy if exists "Admin can manage offers" on partner_offers;
create policy "Admin can manage offers"
  on partner_offers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can read all clicks" on partner_offer_clicks;
create policy "Admin can read all clicks"
  on partner_offer_clicks for select
  using (public.is_admin());


-- ---------------------------------------------------------------------
-- 00029_fix_created_by_fk_set_null.sql
-- ---------------------------------------------------------------------
-- Actually make couples.created_by ON DELETE SET NULL (completes 00017).
--
-- What it fixes (found while verifying this wave against a scratch DB):
-- 00017 assumed couples_created_by_fkey "never had a real FK" and its DO block
-- only ADDS the constraint when missing — but 00001 already created it (with
-- the default NO ACTION), so 00017 silently left it as NO ACTION. Result in
-- production: deleting a profile that created a couple violates the FK, so
-- auth.admin.deleteUser inside the delete-account edge function FAILS for any
-- couple creator — breaking account deletion (App Store Guideline 5.1.1.v),
-- exactly what 00017 set out to fix. The couples_protect_immutable_columns
-- trigger (00027) explicitly permits created_by -> NULL for this action.
--
-- Idempotent: drops the constraint if present and recreates it with
-- ON DELETE SET NULL (created_by is already nullable since 00017).
-- Rollback: recreate the constraint without ON DELETE SET NULL (reintroduces
-- the account-deletion failure — don't).

alter table couples
  drop constraint if exists couples_created_by_fkey;

alter table couples
  add constraint couples_created_by_fkey
    foreign key (created_by) references profiles(id) on delete set null;


-- ---------------------------------------------------------------------
-- 00030_signup_language_from_metadata.sql
-- ---------------------------------------------------------------------
-- Signup locale: honor the language the client detected on the device.
--
-- What it fixes (audit id 74, client half landed in @paca/api): signUp now
-- sends options.data.language (device-derived, one of en/pt/ru/uk), but
-- handle_new_user (00005) hardcodes 'en', so every profile still starts in
-- English. Reads the metadata value, whitelisted to the supported locales.
--
-- Additive/idempotent: CREATE OR REPLACE only; also upgrades the search_path
-- pin to include pg_temp (00005 pinned only public).
--
-- Rollback: re-run the definition from 00005.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'language' in ('en', 'pt', 'ru', 'uk')
        then new.raw_user_meta_data->>'language'
      else 'en'
    end
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;


-- ---------------------------------------------------------------------
-- 00031_subscriptions_rc_last_event_at.sql
-- ---------------------------------------------------------------------
-- Webhook ordering: store the RevenueCat event's OWN timestamp.
--
-- What it fixes (code review on feat/hardening-and-blog): the
-- revenuecat-webhook stale-event guard compared event_timestamp_ms against
-- subscriptions.updated_at — OUR processing time, not the event's time. A
-- refund emitted seconds after a renewal but DELIVERED later was dropped as
-- 'stale_event', leaving the couple Premium after their money went back.
-- Storing the last applied event's timestamp lets the webhook compare event
-- time vs event time (it degrades gracefully while this column is unapplied:
-- it simply skips the ordering guard, keeping event-id idempotency).
--
-- Additive/idempotent: ADD COLUMN IF NOT EXISTS only. Safe on the live DB;
-- existing rows get NULL, which the webhook treats as "no ordering info yet".
--
-- Rollback: alter table subscriptions drop column if exists rc_last_event_at;
alter table subscriptions
  add column if not exists rc_last_event_at timestamptz; -- event_timestamp_ms of the last applied RC event


-- ---------------------------------------------------------------------
-- 00032_replica_identity_full_for_deletes.sql
-- ---------------------------------------------------------------------
-- Realtime DELETE payloads: carry the full old row, not just the PK.
--
-- What it fixes: postgres_changes DELETE events under the default replica
-- identity contain only the old primary key, so the clients' couple/user
-- filters can never match them. The apps therefore subscribe to DELETEs
-- unfiltered and, before this migration, refetched on EVERY couple's delete
-- (cross-tenant invalidation storm that scales with the whole user base).
-- With replica identity full, payload.old carries couple_id /
-- target_user_id and the clients (useRealtimeTransactions, useNotifications)
-- skip other tenants' events. Clients degrade gracefully if this is not
-- applied (they keep the invalidate-on-any-delete behavior).
--
-- Cost: DELETEs on these tables write the full old row to WAL — negligible
-- at this app's volume.
--
-- Rollback: alter table public.transactions replica identity default;
--           alter table public.notifications replica identity default;
alter table public.transactions replica identity full;
alter table public.notifications replica identity full;


-- ---------------------------------------------------------------------
-- 00033_blog_subscribers.sql
-- ---------------------------------------------------------------------
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
