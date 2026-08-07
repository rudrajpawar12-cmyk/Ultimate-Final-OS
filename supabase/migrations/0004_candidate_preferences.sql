-- Backend Phase 3F: Career Preferences persistence
-- Each preferences record belongs exclusively to the authenticated user.
-- A user has exactly one preferences record (1:1 relationship).

create table if not exists public.candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  desired_roles text[] not null default '{}',
  locations text[] not null default '{}',
  work_mode text not null default 'remote',
  min_salary integer not null default 0,
  notice_period text,
  open_to_relocate boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint candidate_preferences_user_unique unique (user_id)
);

-- Query optimization: reads are scoped by user.
create index if not exists candidate_preferences_user_id_idx on public.candidate_preferences (user_id);

-- Row Level Security: a user may only see and mutate their own record.
alter table public.candidate_preferences enable row level security;

drop policy if exists "candidate_preferences_select_own" on public.candidate_preferences;
create policy "candidate_preferences_select_own"
  on public.candidate_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "candidate_preferences_insert_own" on public.candidate_preferences;
create policy "candidate_preferences_insert_own"
  on public.candidate_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "candidate_preferences_update_own" on public.candidate_preferences;
create policy "candidate_preferences_update_own"
  on public.candidate_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "candidate_preferences_delete_own" on public.candidate_preferences;
create policy "candidate_preferences_delete_own"
  on public.candidate_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);