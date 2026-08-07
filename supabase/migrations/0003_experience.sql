-- Backend Phase 3C: Experience persistence
-- Each experience record belongs exclusively to the authenticated user.

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  job_title text not null,
  employment_type text,
  location text,
  start_date text,
  end_date text,
  currently_working boolean not null default false,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by user and ordered by start date.
create index if not exists experience_user_id_idx on public.experience (user_id);
create index if not exists experience_start_date_idx on public.experience (start_date desc);

-- Row Level Security: a user may only see and mutate their own records.
alter table public.experience enable row level security;

drop policy if exists "experience_select_own" on public.experience;
create policy "experience_select_own"
  on public.experience for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "experience_insert_own" on public.experience;
create policy "experience_insert_own"
  on public.experience for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "experience_update_own" on public.experience;
create policy "experience_update_own"
  on public.experience for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "experience_delete_own" on public.experience;
create policy "experience_delete_own"
  on public.experience for delete
  to authenticated
  using ((select auth.uid()) = user_id);