-- Backend Phase X1: Candidate profile persistence
-- Each candidate profile belongs exclusively to the authenticated user.

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  bio text,
  phone text,
  location text,
  profile_photo_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by user.
create index if not exists candidate_profiles_user_id_idx on public.candidate_profiles (user_id);

-- Row Level Security: a user may only see and mutate their own profile.
alter table public.candidate_profiles enable row level security;

drop policy if exists "candidate_profiles_select_own" on public.candidate_profiles;
create policy "candidate_profiles_select_own"
  on public.candidate_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "candidate_profiles_insert_own" on public.candidate_profiles;
create policy "candidate_profiles_insert_own"
  on public.candidate_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "candidate_profiles_update_own" on public.candidate_profiles;
create policy "candidate_profiles_update_own"
  on public.candidate_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "candidate_profiles_delete_own" on public.candidate_profiles;
create policy "candidate_profiles_delete_own"
  on public.candidate_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);