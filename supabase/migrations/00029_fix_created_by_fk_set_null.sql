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
