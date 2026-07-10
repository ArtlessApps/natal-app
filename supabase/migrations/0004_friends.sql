-- Friends (PRD §4.5 + §7 + Build Phase 8). Safe to re-run.
-- Paste into the Supabase SQL editor if the CLI isn't linked yet.
--
-- A "friend" is a guest chart the owner has added for comparison. No account
-- is required for the friend themselves — the owner stores their computed
-- chart_json. RLS restricts every row to its owner.

create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  guest_name text not null,
  guest_chart_json jsonb not null,
  -- Kept so the owner can re-open / re-cast a friend's chart later without
  -- re-typing; birth data is not otherwise sensitive here (owner entered it).
  birth_date date,
  birth_time time,
  birth_place_label text,
  created_at timestamptz not null default now()
);

create index if not exists friends_owner_idx on friends (owner_id, created_at desc);

alter table friends enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'friends' and policyname = 'Owners read their friends') then
    create policy "Owners read their friends" on friends
      for select using (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'friends' and policyname = 'Owners add their friends') then
    create policy "Owners add their friends" on friends
      for insert with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'friends' and policyname = 'Owners update their friends') then
    create policy "Owners update their friends" on friends
      for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'friends' and policyname = 'Owners delete their friends') then
    create policy "Owners delete their friends" on friends
      for delete using (auth.uid() = owner_id);
  end if;
end $$;
