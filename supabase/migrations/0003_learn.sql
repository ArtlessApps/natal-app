-- Learn tab (PRD §4.4 + Build Phase 7). Safe to re-run.
-- Paste into the Supabase SQL editor if the CLI isn't linked yet.

-- Per-user lesson completion. lesson_id is a stable string key from the
-- app's lesson catalog (src/constants/lessons.ts), e.g. 'planet-venus'.
create table if not exists learn_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table learn_progress enable row level security;

create policy "Users read their own learn progress"
  on learn_progress for select
  using (auth.uid() = user_id);

create policy "Users insert their own learn progress"
  on learn_progress for insert
  with check (auth.uid() = user_id);

create policy "Users delete their own learn progress"
  on learn_progress for delete
  using (auth.uid() = user_id);

-- content_natal is non-sensitive reference content the Learn tab reads
-- directly with the user's authenticated session. Enable RLS + a read-only
-- policy so access is explicit. (Only affects content_natal; /daily reads
-- content_collisions / content_walking, which are untouched here. The Python
-- engine uses the service key and bypasses RLS regardless.)
alter table content_natal enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'content_natal' and policyname = 'Authenticated can read natal content'
  ) then
    create policy "Authenticated can read natal content"
      on content_natal for select
      to authenticated
      using (true);
  end if;
end $$;
