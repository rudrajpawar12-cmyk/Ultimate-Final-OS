-- Backend Phase 3G: Resume Metadata persistence
-- Each resume record belongs exclusively to the authenticated user (RLS enforced).
-- A user may have multiple resumes but only one active at a time.

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  original_file_name text not null,
  file_size integer not null default 0,
  mime_type text not null default 'application/pdf',
  uploaded_at timestamptz not null default timezone('utc'::text, now()),
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: reads are scoped by user.
create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_user_active_idx on public.resumes (user_id, is_active) where is_active = true;

-- Row Level Security: a user may only see and mutate their own records.
alter table public.resumes enable row level security;

drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
  on public.resumes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own"
  on public.resumes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own"
  on public.resumes for delete
  to authenticated
  using ((select auth.uid()) = user_id);