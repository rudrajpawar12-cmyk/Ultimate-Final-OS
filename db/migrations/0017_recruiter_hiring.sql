-- Backend Phase R1: Recruiter hiring — applicant notes, interviews and
-- application source tracking.
--
-- Run this in the Supabase SQL editor (this project uses its own Supabase
-- project, so migrations are applied manually).
--
-- Adds the two tables the recruiter module needs (application notes and
-- interviews) plus a `source` column on applications for source analytics.
-- No existing table is recreated.

BEGIN;

-- ---------------------------------------------------------------------------
-- applications: source tracking (used by analytics source breakdown)
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists source text not null default 'direct';

create index if not exists applications_recruiter_id_idx
  on public.applications (recruiter_id);
create index if not exists applications_job_id_idx
  on public.applications (job_id);
create index if not exists applications_status_idx
  on public.applications (status);

-- ---------------------------------------------------------------------------
-- helper: current recruiter id for the signed-in user
-- ---------------------------------------------------------------------------
create or replace function public.current_recruiter_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from public.recruiters r
  where r.user_id = auth.uid()
  limit 1
$$;

grant execute on function public.current_recruiter_id() to authenticated;

-- ---------------------------------------------------------------------------
-- application_notes
-- ---------------------------------------------------------------------------
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  author text not null default 'Recruiter',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists application_notes_application_id_idx
  on public.application_notes (application_id);
create index if not exists application_notes_recruiter_id_idx
  on public.application_notes (recruiter_id);

grant select, insert, update, delete on public.application_notes to authenticated;
grant all on public.application_notes to service_role;

alter table public.application_notes enable row level security;

drop policy if exists "application_notes_recruiter_all" on public.application_notes;
create policy "application_notes_recruiter_all"
  on public.application_notes for all
  to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  stage text not null default 'screening',
  state text not null default 'scheduled',
  scheduled_at timestamptz not null default timezone('utc'::text, now()),
  duration_minutes integer not null default 45,
  mode text not null default 'video',
  location text not null default '',
  panel jsonb not null default '[]'::jsonb,
  notes text not null default '',
  feedback jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists interviews_recruiter_id_idx on public.interviews (recruiter_id);
create index if not exists interviews_application_id_idx on public.interviews (application_id);
create index if not exists interviews_scheduled_at_idx on public.interviews (scheduled_at desc);

grant select, insert, update, delete on public.interviews to authenticated;
grant all on public.interviews to service_role;

alter table public.interviews enable row level security;

drop policy if exists "interviews_recruiter_all" on public.interviews;
create policy "interviews_recruiter_all"
  on public.interviews for all
  to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

-- Candidates can read their own interviews.
drop policy if exists "interviews_select_own_candidate" on public.interviews;
create policy "interviews_select_own_candidate"
  on public.interviews for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications a
      where a.id = interviews.application_id
        and a.user_id = auth.uid()
    )
  );

COMMIT;
