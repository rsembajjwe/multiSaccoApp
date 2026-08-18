-- Supports SACCO subscription lifecycle management: a daily job expires lapsed subscriptions and sends
-- renewal reminders before expiry. `last_reminder_on` deduplicates reminders so a SACCO is reminded at
-- most once per day during the pre-expiry window. Nullable; existing rows need no backfill.
ALTER TABLE subscriptions ADD COLUMN last_reminder_on DATE;
