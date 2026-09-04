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
