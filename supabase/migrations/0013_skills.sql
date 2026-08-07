-- Backend Phase X3: Skills persistence
-- Each skill record belongs exclusively to the authenticated user.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_name text not null,
  proficiency_level text not null default 'intermediate',
  years_of_experience integer,
  category text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by user and ordered by creation date.
create index if not exists skills_user_id_idx on public.skills (user_id);
create index if not exists skills_created_at_idx on public.skills (created_at desc);

-- Row Level Security: a user may only see and mutate their own records.
alter table public.skills enable row level security;

drop policy if exists "skills_select_own" on public.skills;
create policy "skills_select_own"
  on public.skills for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "skills_insert_own" on public.skills;
create policy "skills_insert_own"
  on public.skills for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "skills_update_own" on public.skills;
create policy "skills_update_own"
  on public.skills for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "skills_delete_own" on public.skills;
create policy "skills_delete_own"
  on public.skills for delete
  to authenticated
  using ((select auth.uid()) = user_id);