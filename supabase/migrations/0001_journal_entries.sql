-- Journal entries table (PRD §7 + Build Phase 4/5).
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) — this repo
-- has no Supabase CLI project linked yet, so migrations aren't applied
-- automatically.

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  text text not null,
  transit_planet text,
  natal_planet text,
  aspect text,
  intensity text, -- COLLISION | TRANSIT | RIPPLE | WALKING
  content_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `alter ... add column if not exists` so re-running this file is safe
-- whether the table above already existed (Step 4) or not (fresh run).
alter table journal_entries add column if not exists phase text; -- New | Full | Retrograde | Direct | null (WALKING days only)
alter table journal_entries add column if not exists headline text; -- snapshot of that day's reading, so edits to content_* later don't change past entries
alter table journal_entries add column if not exists body text;

-- One entry per user per day (Today screen only ever shows/creates one).
create unique index if not exists journal_entries_user_date_idx
  on journal_entries (user_id, entry_date);

alter table journal_entries enable row level security;

create policy "Users can read their own journal entries"
  on journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
  on journal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on journal_entries for delete
  using (auth.uid() = user_id);
