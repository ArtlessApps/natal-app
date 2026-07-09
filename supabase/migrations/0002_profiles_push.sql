-- Push-pipeline columns on profiles (PRD §7 + Build Phase 6).
-- Safe to re-run. Paste into Supabase SQL editor if the CLI isn't linked yet.

alter table profiles add column if not exists tz_str text;
alter table profiles add column if not exists push_token text;
alter table profiles add column if not exists notify_hour_local int not null default 8;
-- Local calendar date (YYYY-MM-DD in the user's tz) of the last successful
-- daily push — stops the hourly cron from double-sending within the same day.
alter table profiles add column if not exists last_push_date date;
