-- Backend Phase X6: Resume Analyses persistence
-- Each analysis record belongs exclusively to the authenticated user (RLS enforced).
-- An analysis is linked to a specific resume via foreign key.

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null references public.resumes (id) on delete cascade,
  overall_score integer not null default 0,
  section_scores jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  suggestions text[] not null default '{}',
  ats_compatibility integer,
  keyword_analysis jsonb,
  raw_analysis jsonb,
  status text not null default 'pending',
  target_role text,
  model_version text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: reads are scoped by user and resume.
create index if not exists resume_analyses_user_id_idx on public.resume_analyses (user_id);
create index if not exists resume_analyses_resume_id_idx on public.resume_analyses (resume_id);
create index if not exists resume_analyses_user_resume_idx on public.resume_analyses (user_id, resume_id);

-- Row Level Security: a user may only see and mutate their own records.
alter table public.resume_analyses enable row level security;

drop policy if exists "resume_analyses_select_own" on public.resume_analyses;
create policy "resume_analyses_select_own"
  on public.resume_analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "resume_analyses_insert_own" on public.resume_analyses;
create policy "resume_analyses_insert_own"
  on public.resume_analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "resume_analyses_update_own" on public.resume_analyses;
create policy "resume_analyses_update_own"
  on public.resume_analyses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "resume_analyses_delete_own" on public.resume_analyses;
create policy "resume_analyses_delete_own"
  on public.resume_analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id);