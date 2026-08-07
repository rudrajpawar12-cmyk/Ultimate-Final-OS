-- ============ helpers ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = timezone('utc'::text, now()); return new; end; $$;

-- ============ recruiters ============
create table if not exists public.recruiters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  work_email text, phone text, designation text,
  company_name text, company_website text, linkedin_url text,
  bio text, profile_photo_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
grant select, insert, update, delete on public.recruiters to authenticated;
grant all on public.recruiters to service_role;
alter table public.recruiters enable row level security;
drop policy if exists "recruiters_own_all" on public.recruiters;
create policy "recruiters_own_all" on public.recruiters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists recruiters_set_updated_at on public.recruiters;
create trigger recruiters_set_updated_at before update on public.recruiters
  for each row execute function public.set_updated_at();

create or replace function public.current_recruiter_id()
returns uuid language sql stable security definer set search_path = public as $$
  select r.id from public.recruiters r where r.user_id = auth.uid() limit 1
$$;
grant execute on function public.current_recruiter_id() to authenticated;

-- ============ candidate_profiles ============
create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  headline text, bio text, phone text, location text,
  profile_photo_url text,
  linkedin_url text, github_url text, portfolio_url text, twitter_url text, website_url text,
  profile_views integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
grant select, insert, update, delete on public.candidate_profiles to authenticated;
grant all on public.candidate_profiles to service_role;
alter table public.candidate_profiles enable row level security;
drop policy if exists "candidate_profiles_own_all" on public.candidate_profiles;
create policy "candidate_profiles_own_all" on public.candidate_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists candidate_profiles_set_updated_at on public.candidate_profiles;
create trigger candidate_profiles_set_updated_at before update on public.candidate_profiles
  for each row execute function public.set_updated_at();

-- ============ companies ============
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters(id) on delete cascade,
  company_name text not null,
  legal_name text, description text, industry text, company_size text,
  website text, email text, phone text, logo_url text,
  address text, city text, state text, country text, postal_code text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists companies_recruiter_id_idx on public.companies(recruiter_id);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
drop policy if exists "companies_recruiter_all" on public.companies;
create policy "companies_recruiter_all" on public.companies for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- ============ jobs ============
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.recruiters(id) on delete cascade,
  title text not null,
  description text not null default '',
  requirements text, responsibilities text, benefits text,
  company_name text, department text, location text,
  employment_type text, workplace_type text, experience_level text,
  min_experience integer, max_experience integer,
  min_salary integer, max_salary integer, currency text,
  skills text[] not null default '{}',
  status text not null default 'draft',
  application_deadline timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists jobs_recruiter_id_idx on public.jobs(recruiter_id);
create index if not exists jobs_status_idx on public.jobs(status);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
drop policy if exists "jobs_recruiter_all" on public.jobs;
create policy "jobs_recruiter_all" on public.jobs for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
drop policy if exists "jobs_select_open_candidate" on public.jobs;
create policy "jobs_select_open_candidate" on public.jobs for select to authenticated
  using (status in ('open','published','active'));
drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

drop policy if exists "companies_select_public_candidate" on public.companies;
create policy "companies_select_public_candidate" on public.companies for select to authenticated
  using (exists (select 1 from public.jobs j where j.recruiter_id = companies.recruiter_id
    and j.status in ('open','published','active')));

-- ============ resumes ============
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  original_file_name text not null,
  storage_path text,
  file_size integer not null default 0,
  mime_type text not null default 'application/pdf',
  is_active boolean not null default false,
  uploaded_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists resumes_user_id_idx on public.resumes(user_id);
grant select, insert, update, delete on public.resumes to authenticated;
grant all on public.resumes to service_role;
alter table public.resumes enable row level security;
drop policy if exists "resumes_own_all" on public.resumes;
create policy "resumes_own_all" on public.resumes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function public.set_updated_at();

-- ============ applications ============
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid references public.recruiters(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  cover_letter text,
  status text not null default 'applied',
  source text not null default 'direct',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists applications_job_id_idx on public.applications(job_id);
create index if not exists applications_recruiter_id_idx on public.applications(recruiter_id);
create index if not exists applications_status_idx on public.applications(status);
create unique index if not exists applications_user_job_unique on public.applications(user_id, job_id);
grant select, insert, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
drop policy if exists "applications_select_own_candidate" on public.applications;
create policy "applications_select_own_candidate" on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "applications_insert_own_candidate" on public.applications;
create policy "applications_insert_own_candidate" on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "applications_withdraw_own_candidate" on public.applications;
create policy "applications_withdraw_own_candidate" on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'withdrawn');
drop policy if exists "applications_select_recruiter" on public.applications;
create policy "applications_select_recruiter" on public.applications for select to authenticated
  using (recruiter_id = public.current_recruiter_id());
drop policy if exists "applications_update_recruiter" on public.applications;
create policy "applications_update_recruiter" on public.applications for update to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create or replace function public.is_recruiter_applicant(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications a
    join public.recruiters r on r.id = a.recruiter_id
    where a.user_id = _user_id and r.user_id = auth.uid())
$$;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated;

create or replace function public.recruiter_applicant_emails()
returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select distinct a.user_id, u.email::text
  from public.applications a
  join public.recruiters r on r.id = a.recruiter_id
  join auth.users u on u.id = a.user_id
  where r.user_id = auth.uid()
$$;
grant execute on function public.recruiter_applicant_emails() to authenticated;

-- ============ application_events ============
create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  title text not null,
  description text,
  actor text not null default 'system',
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists application_events_application_id_idx
  on public.application_events(application_id, created_at desc);
grant select, insert on public.application_events to authenticated;
grant all on public.application_events to service_role;
alter table public.application_events enable row level security;
drop policy if exists "application_events_own_select" on public.application_events;
create policy "application_events_own_select" on public.application_events for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "application_events_own_insert" on public.application_events;
create policy "application_events_own_insert" on public.application_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "application_events_recruiter_select" on public.application_events;
create policy "application_events_recruiter_select" on public.application_events for select to authenticated
  using (public.is_recruiter_applicant(user_id));

-- ============ application_notes ============
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  recruiter_id uuid not null references public.recruiters(id) on delete cascade,
  author text not null default 'Recruiter',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists application_notes_application_id_idx on public.application_notes(application_id);
grant select, insert, update, delete on public.application_notes to authenticated;
grant all on public.application_notes to service_role;
alter table public.application_notes enable row level security;
drop policy if exists "application_notes_recruiter_all" on public.application_notes;
create policy "application_notes_recruiter_all" on public.application_notes for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

-- ============ interviews ============
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
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
create index if not exists interviews_recruiter_id_idx on public.interviews(recruiter_id);
create index if not exists interviews_application_id_idx on public.interviews(application_id);
create index if not exists interviews_scheduled_at_idx on public.interviews(scheduled_at desc);
grant select, insert, update, delete on public.interviews to authenticated;
grant all on public.interviews to service_role;
alter table public.interviews enable row level security;
drop policy if exists "interviews_recruiter_all" on public.interviews;
create policy "interviews_recruiter_all" on public.interviews for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
drop policy if exists "interviews_select_own_candidate" on public.interviews;
create policy "interviews_select_own_candidate" on public.interviews for select to authenticated
  using (exists (select 1 from public.applications a
    where a.id = interviews.application_id and a.user_id = (select auth.uid())));
drop trigger if exists interviews_set_updated_at on public.interviews;
create trigger interviews_set_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();

-- ============ resume_analyses ============
create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  status text not null default 'pending',
  overall_score integer not null default 0,
  ats_compatibility integer,
  section_scores jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  suggestions text[] not null default '{}',
  keyword_analysis jsonb,
  raw_analysis jsonb,
  target_role text,
  model_version text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists resume_analyses_user_id_idx on public.resume_analyses(user_id, created_at desc);
create index if not exists resume_analyses_resume_id_idx on public.resume_analyses(resume_id);
grant select, insert, update, delete on public.resume_analyses to authenticated;
grant all on public.resume_analyses to service_role;
alter table public.resume_analyses enable row level security;
drop policy if exists "resume_analyses_own_all" on public.resume_analyses;
create policy "resume_analyses_own_all" on public.resume_analyses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists resume_analyses_set_updated_at on public.resume_analyses;
create trigger resume_analyses_set_updated_at before update on public.resume_analyses
  for each row execute function public.set_updated_at();