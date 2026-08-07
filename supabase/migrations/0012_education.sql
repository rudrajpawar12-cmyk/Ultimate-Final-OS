-- Backend Phase X2: Education persistence
-- Each education record belongs exclusively to the authenticated user.

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  degree text not null,
  field_of_study text,
  start_date text,
  end_date text,
  grade text,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by user and ordered by start date.
create index if not exists education_user_id_idx on public.education (user_id);
create index if not exists education_start_date_idx on public.education (start_date desc);

-- Row Level Security: a user may only see and mutate their own records.
alter table public.education enable row level security;

drop policy if exists "education_select_own" on public.education;
create policy "education_select_own"
  on public.education for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "education_insert_own" on public.education;
create policy "education_insert_own"
  on public.education for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "education_update_own" on public.education;
create policy "education_update_own"
  on public.education for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "education_delete_own" on public.education;
create policy "education_delete_own"
  on public.education for delete
  to authenticated
  using ((select auth.uid()) = user_id);