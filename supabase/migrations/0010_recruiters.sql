-- Backend Phase 5A.1: Recruiter database migration
-- Each recruiter record belongs exclusively to the authenticated user.

create table if not exists public.recruiters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  company_name text,
  designation text,
  work_email text,
  phone text,
  linkedin_url text,
  company_website text,
  profile_photo_url text,
  bio text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by user.
create index if not exists recruiters_user_id_idx on public.recruiters (user_id);

-- Row Level Security: a user may only see and mutate their own records.
alter table public.recruiters enable row level security;

drop policy if exists "recruiters_select_own" on public.recruiters;
create policy "recruiters_select_own"
  on public.recruiters for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recruiters_insert_own" on public.recruiters;
create policy "recruiters_insert_own"
  on public.recruiters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recruiters_update_own" on public.recruiters;
create policy "recruiters_update_own"
  on public.recruiters for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "recruiters_delete_own" on public.recruiters;
create policy "recruiters_delete_own"
  on public.recruiters for delete
  to authenticated
  using ((select auth.uid()) = user_id);