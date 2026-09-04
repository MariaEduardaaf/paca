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
