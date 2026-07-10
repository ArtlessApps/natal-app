-- Friend invites (Step 8.6, supersedes §8a "share-link flow" debt item).
-- A pending invite is a friends row without a chart yet. Safe to re-run.

-- Pending rows can't have a name/chart yet, so these lose NOT NULL.
alter table friends alter column guest_name drop not null;
alter table friends alter column guest_chart_json drop not null;

-- Postgres generates the unguessable link token — no client crypto needed.
alter table friends add column if not exists token text unique default gen_random_uuid()::text;
alter table friends add column if not exists status text not null default 'complete';
  -- 'pending' = invite sent, waiting on guest · 'complete' = chart present
alter table friends add column if not exists source text not null default 'manual';
  -- 'manual' | 'invite' — growth-lever scorecard (pairs with 8.5 share counts)

-- No RLS changes: the owner inserts pending rows (existing insert policy
-- covers it — owner_id = auth.uid()), and the GUEST never touches Supabase.
-- Guest completion flows through natal-api's service key, like the cron.
