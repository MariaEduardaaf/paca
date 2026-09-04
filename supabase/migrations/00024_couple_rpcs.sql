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
