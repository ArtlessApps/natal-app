-- Per-user transit cooldown tracking (PRD §8a debt item). Safe to re-run.
-- Paste into the Supabase SQL editor if the CLI isn't linked yet.
--
-- compute_daily() in natal-api/engine.py needs cross-day history to stop the
-- same transit_planet+aspect+natal_planet firing again too soon (thresholds
-- in engine.py's PLANET_COOLDOWNS). This table is that history: one row per
-- (user, collision_key) holding the last date it was selected as the day's
-- reading. Written only by natal-api via the service-role client — the app
-- never reads or writes this table directly.

create table if not exists transit_cooldowns (
  user_id uuid not null references auth.users (id) on delete cascade,
  collision_key text not null, -- e.g. "Saturn square Venus" (transit_planet + aspect + natal_planet)
  last_fired_date date not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collision_key)
);

alter table transit_cooldowns enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'transit_cooldowns' and policyname = 'Users can read their own cooldown state') then
    create policy "Users can read their own cooldown state" on transit_cooldowns
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- No insert/update/delete policy: only the service-role client (natal-api)
-- writes this table, and the service role bypasses RLS entirely.
