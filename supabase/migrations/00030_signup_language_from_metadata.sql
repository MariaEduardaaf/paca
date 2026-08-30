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
