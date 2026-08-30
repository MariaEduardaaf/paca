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
