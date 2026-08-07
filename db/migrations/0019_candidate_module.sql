-- Backend Phase C1: Candidate module Supabase migration.
--
-- Run this in the Supabase SQL editor after 0018_recruiter_applicant_access.sql
-- (this project uses its own Supabase project, so migrations are applied
-- manually).
--
-- Strictly ADDITIVE: no existing table is recreated and no existing policy is
-- removed. It adds
--   * the candidate profile columns the profile UI already edits
--     (headline, social links, profile views),
--   * a `saved_jobs` table for the saved-jobs feature,
--   * candidate read access to open jobs + their companies,
--   * candidate own-row access on applications (apply / withdraw / track).

BEGIN;

-- ---------------------------------------------------------------------------
-- candidate_profiles: headline, social links, profile views
-- ---------------------------------------------------------------------------
alter table public.candidate_profiles
  add column if not exists headline text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists portfolio_url text,
  add column if not exists twitter_url text,
  add column if not exists website_url text,
  add column if not exists profile_views integer not null default 0;

-- ---------------------------------------------------------------------------
-- saved_jobs
-- ---------------------------------------------------------------------------
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);

create index if not exists saved_jobs_user_id_idx on public.saved_jobs (user_id);
create index if not exists saved_jobs_job_id_idx on public.saved_jobs (job_id);

grant select, insert, update, delete on public.saved_jobs to authenticated;
grant all on public.saved_jobs to service_role;

alter table public.saved_jobs enable row level security;

drop policy if exists "saved_jobs_own_all" on public.saved_jobs;
create policy "saved_jobs_own_all"
  on public.saved_jobs for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- jobs / companies: candidate read access
-- ---------------------------------------------------------------------------
grant select on public.jobs to authenticated;
grant select on public.companies to authenticated;

-- Any signed-in user may read published/open roles (job discovery + details).
drop policy if exists "jobs_select_open_candidate" on public.jobs;
create policy "jobs_select_open_candidate"
  on public.jobs for select
  to authenticated
  using (status in ('open', 'published', 'active'));

-- Companies are only readable as the employer behind a readable job.
drop policy if exists "companies_select_public_candidate" on public.companies;
create policy "companies_select_public_candidate"
  on public.companies for select
  to authenticated
  using (
    exists (
      select 1
      from public.jobs j
      where j.recruiter_id = companies.recruiter_id
        and j.status in ('open', 'published', 'active')
    )
  );

-- ---------------------------------------------------------------------------
-- applications: candidate own-row access (apply, track, withdraw)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.applications to authenticated;

create index if not exists applications_user_id_idx
  on public.applications (user_id);

drop policy if exists "applications_select_own_candidate" on public.applications;
create policy "applications_select_own_candidate"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "applications_insert_own_candidate" on public.applications;
create policy "applications_insert_own_candidate"
  on public.applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Candidates may only move their own application to `withdrawn`.
drop policy if exists "applications_withdraw_own_candidate" on public.applications;
create policy "applications_withdraw_own_candidate"
  on public.applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'withdrawn');

-- One application per candidate per job (duplicate-apply protection).
create unique index if not exists applications_user_job_unique
  on public.applications (user_id, job_id);

COMMIT;
