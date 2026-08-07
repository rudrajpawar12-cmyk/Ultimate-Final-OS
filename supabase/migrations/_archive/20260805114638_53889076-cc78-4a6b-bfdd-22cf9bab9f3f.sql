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

-- ============ saved_jobs ============
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);
create index if not exists saved_jobs_user_id_idx on public.saved_jobs(user_id);
grant select, insert, update, delete on public.saved_jobs to authenticated;
grant all on public.saved_jobs to service_role;
alter table public.saved_jobs enable row level security;
drop policy if exists "saved_jobs_own_all" on public.saved_jobs;
create policy "saved_jobs_own_all" on public.saved_jobs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ============ skills / education / experience / projects ============
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null,
  category text,
  proficiency_level text not null default 'intermediate',
  years_of_experience numeric,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists skills_user_id_idx on public.skills(user_id);
grant select, insert, update, delete on public.skills to authenticated;
grant all on public.skills to service_role;
alter table public.skills enable row level security;
drop policy if exists "skills_own_all" on public.skills;
create policy "skills_own_all" on public.skills for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills
  for each row execute function public.set_updated_at();

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text not null,
  degree text not null,
  field_of_study text, grade text, description text,
  start_date date, end_date date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists education_user_id_idx on public.education(user_id);
grant select, insert, update, delete on public.education to authenticated;
grant all on public.education to service_role;
alter table public.education enable row level security;
drop policy if exists "education_own_all" on public.education;
create policy "education_own_all" on public.education for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists education_set_updated_at on public.education;
create trigger education_set_updated_at before update on public.education
  for each row execute function public.set_updated_at();

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  employment_type text, location text, description text,
  start_date date, end_date date,
  currently_working boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists experience_user_id_idx on public.experience(user_id);
grant select, insert, update, delete on public.experience to authenticated;
grant all on public.experience to service_role;
alter table public.experience enable row level security;
drop policy if exists "experience_own_all" on public.experience;
create policy "experience_own_all" on public.experience for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists experience_set_updated_at on public.experience;
create trigger experience_set_updated_at before update on public.experience
  for each row execute function public.set_updated_at();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  technologies text[],
  github_url text, live_url text,
  start_date date, end_date date,
  currently_active boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists projects_user_id_idx on public.projects(user_id);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
drop policy if exists "projects_own_all" on public.projects;
create policy "projects_own_all" on public.projects for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- recruiter read access to their applicants' data
drop policy if exists "candidate_profiles_select_recruiter" on public.candidate_profiles;
create policy "candidate_profiles_select_recruiter" on public.candidate_profiles for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "experience_select_recruiter" on public.experience;
create policy "experience_select_recruiter" on public.experience for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "education_select_recruiter" on public.education;
create policy "education_select_recruiter" on public.education for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "projects_select_recruiter" on public.projects;
create policy "projects_select_recruiter" on public.projects for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "skills_select_recruiter" on public.skills;
create policy "skills_select_recruiter" on public.skills for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "resumes_select_recruiter" on public.resumes;
create policy "resumes_select_recruiter" on public.resumes for select to authenticated
  using (public.is_recruiter_applicant(user_id));
drop policy if exists "resume_analyses_select_recruiter" on public.resume_analyses;
create policy "resume_analyses_select_recruiter" on public.resume_analyses for select to authenticated
  using (public.is_recruiter_applicant(user_id));

-- ============ candidate_preferences ============
create table if not exists public.candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  desired_roles text[] not null default '{}',
  locations text[] not null default '{}',
  work_mode text not null default 'any',
  min_salary integer not null default 0,
  open_to_relocate boolean not null default false,
  notice_period text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
grant select, insert, update, delete on public.candidate_preferences to authenticated;
grant all on public.candidate_preferences to service_role;
alter table public.candidate_preferences enable row level security;
drop policy if exists "candidate_preferences_own_all" on public.candidate_preferences;
create policy "candidate_preferences_own_all" on public.candidate_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists candidate_preferences_set_updated_at on public.candidate_preferences;
create trigger candidate_preferences_set_updated_at before update on public.candidate_preferences
  for each row execute function public.set_updated_at();

-- ============ notifications ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'info',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists "notifications_own_all" on public.notifications;
create policy "notifications_own_all" on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- ============ onboarding_progress ============
create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_step text not null default '',
  completed_steps text[] not null default '{}',
  onboarding_data jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
grant select, insert, update, delete on public.onboarding_progress to authenticated;
grant all on public.onboarding_progress to service_role;
alter table public.onboarding_progress enable row level security;
drop policy if exists "onboarding_progress_own_all" on public.onboarding_progress;
create policy "onboarding_progress_own_all" on public.onboarding_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists onboarding_progress_set_updated_at on public.onboarding_progress;
create trigger onboarding_progress_set_updated_at before update on public.onboarding_progress
  for each row execute function public.set_updated_at();

-- ============ profile_completion ============
create table if not exists public.profile_completion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  percentage integer not null default 0,
  completed_sections text[] not null default '{}',
  incomplete_sections text[] not null default '{}',
  missing_fields text[] not null default '{}',
  section_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
grant select, insert, update, delete on public.profile_completion to authenticated;
grant all on public.profile_completion to service_role;
alter table public.profile_completion enable row level security;
drop policy if exists "profile_completion_own_all" on public.profile_completion;
create policy "profile_completion_own_all" on public.profile_completion for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists profile_completion_set_updated_at on public.profile_completion;
create trigger profile_completion_set_updated_at before update on public.profile_completion
  for each row execute function public.set_updated_at();

revoke execute on function public.current_recruiter_id() from public, anon;
revoke execute on function public.is_recruiter_applicant(uuid) from public, anon;
revoke execute on function public.recruiter_applicant_emails() from public, anon;
grant execute on function public.current_recruiter_id() to authenticated, service_role;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated, service_role;
grant execute on function public.recruiter_applicant_emails() to authenticated, service_role;

alter table public.recruiters
  add column if not exists job_title text not null default '',
  add column if not exists department text,
  add column if not exists company_logo_url text,
  add column if not exists company_industry text,
  add column if not exists company_size text,
  add column if not exists company_headquarters text,
  add column if not exists hiring_roles text[] not null default '{}'::text[],
  add column if not exists hiring_locations text[] not null default '{}'::text[],
  add column if not exists work_modes text[] not null default '{}'::text[];

create table if not exists public.candidate_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'English',
  timezone text not null default 'UTC',
  two_factor boolean not null default false,
  job_alerts boolean not null default true,
  weekly_digest boolean not null default true,
  profile_visible boolean not null default true,
  application_updates boolean not null default true,
  interview_reminders boolean not null default true,
  new_matches boolean not null default true,
  product_news boolean not null default false,
  plan text not null default 'free',
  renews_on text not null default '',
  ai_credits_used integer not null default 0,
  ai_credits integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.candidate_settings to authenticated;
grant all on public.candidate_settings to service_role;
alter table public.candidate_settings enable row level security;
drop policy if exists "candidate_settings_select_own" on public.candidate_settings;
create policy "candidate_settings_select_own" on public.candidate_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "candidate_settings_insert_own" on public.candidate_settings;
create policy "candidate_settings_insert_own" on public.candidate_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "candidate_settings_update_own" on public.candidate_settings;
create policy "candidate_settings_update_own" on public.candidate_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "candidate_settings_delete_own" on public.candidate_settings;
create policy "candidate_settings_delete_own" on public.candidate_settings
  for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists candidate_settings_set_updated_at on public.candidate_settings;
create trigger candidate_settings_set_updated_at
  before update on public.candidate_settings
  for each row execute function public.set_updated_at();

create table if not exists public.interview_prep_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  practiced boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);
create index if not exists interview_prep_progress_user_idx
  on public.interview_prep_progress(user_id);
grant select, insert, update, delete on public.interview_prep_progress to authenticated;
grant all on public.interview_prep_progress to service_role;
alter table public.interview_prep_progress enable row level security;
drop policy if exists "interview_prep_select_own" on public.interview_prep_progress;
create policy "interview_prep_select_own" on public.interview_prep_progress
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "interview_prep_insert_own" on public.interview_prep_progress;
create policy "interview_prep_insert_own" on public.interview_prep_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "interview_prep_update_own" on public.interview_prep_progress;
create policy "interview_prep_update_own" on public.interview_prep_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "interview_prep_delete_own" on public.interview_prep_progress;
create policy "interview_prep_delete_own" on public.interview_prep_progress
  for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists interview_prep_progress_set_updated_at on public.interview_prep_progress;
create trigger interview_prep_progress_set_updated_at
  before update on public.interview_prep_progress
  for each row execute function public.set_updated_at();

create table if not exists public.copilot_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, audience)
);
grant select, insert, update, delete on public.copilot_conversations to authenticated;
grant all on public.copilot_conversations to service_role;
alter table public.copilot_conversations enable row level security;
drop policy if exists "copilot_conversations_select_own" on public.copilot_conversations;
create policy "copilot_conversations_select_own" on public.copilot_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "copilot_conversations_insert_own" on public.copilot_conversations;
create policy "copilot_conversations_insert_own" on public.copilot_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "copilot_conversations_update_own" on public.copilot_conversations;
create policy "copilot_conversations_update_own" on public.copilot_conversations
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "copilot_conversations_delete_own" on public.copilot_conversations;
create policy "copilot_conversations_delete_own" on public.copilot_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists copilot_conversations_set_updated_at on public.copilot_conversations;
create trigger copilot_conversations_set_updated_at
  before update on public.copilot_conversations
  for each row execute function public.set_updated_at();

-- ---------- helper: resolve a recruiter's auth user id ----------
create or replace function public.recruiter_user_id(_recruiter_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.recruiters where id = _recruiter_id
$$;
revoke all on function public.recruiter_user_id(uuid) from public, anon, authenticated;

-- ---------- helper: insert a notification ----------
create or replace function public.create_notification(
  _user_id uuid, _type text, _title text, _message text, _link text, _metadata jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _user_id is null then return; end if;
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (_user_id, _type, _title, _message, _link, coalesce(_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.create_notification(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

-- ---------- applications ----------
create or replace function public.notify_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recruiter_uid uuid;
  job_title text;
  candidate_name text;
begin
  select public.recruiter_user_id(new.recruiter_id) into recruiter_uid;
  select title into job_title from public.jobs where id = new.job_id;
  select coalesce(full_name, 'A candidate') into candidate_name
    from public.candidate_profiles where user_id = new.user_id;

  perform public.create_notification(
    recruiter_uid, 'application', 'New application',
    coalesce(candidate_name, 'A candidate') || ' applied to ' || coalesce(job_title, 'your job'),
    '/recruiter/applicants',
    jsonb_build_object('applicationId', new.id, 'jobId', new.job_id)
  );

  perform public.create_notification(
    new.user_id, 'application', 'Application submitted',
    'Your application for ' || coalesce(job_title, 'this role') || ' was received.',
    '/candidate/applications',
    jsonb_build_object('applicationId', new.id, 'jobId', new.job_id)
  );

  insert into public.application_events (application_id, user_id, status, title, description, actor)
  values (new.id, new.user_id, new.status, 'Application submitted',
          'Application sent to ' || coalesce(job_title, 'the employer'), 'candidate');
  return new;
end;
$$;

create or replace function public.notify_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recruiter_uid uuid;
  job_title text;
  candidate_name text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select title into job_title from public.jobs where id = new.job_id;
  select public.recruiter_user_id(new.recruiter_id) into recruiter_uid;

  insert into public.application_events (application_id, user_id, status, title, description, actor)
  values (new.id, new.user_id, new.status, 'Status changed to ' || new.status,
          'Your application for ' || coalesce(job_title, 'this role') || ' is now ' || new.status,
          case when new.status = 'withdrawn' then 'candidate' else 'recruiter' end);

  if new.status = 'withdrawn' then
    select coalesce(full_name, 'A candidate') into candidate_name
      from public.candidate_profiles where user_id = new.user_id;
    perform public.create_notification(
      recruiter_uid, 'application', 'Application withdrawn',
      coalesce(candidate_name, 'A candidate') || ' withdrew from ' || coalesce(job_title, 'your job'),
      '/recruiter/applicants',
      jsonb_build_object('applicationId', new.id, 'jobId', new.job_id)
    );
  else
    perform public.create_notification(
      new.user_id, 'application', 'Application update',
      'Your application for ' || coalesce(job_title, 'this role') || ' moved to ' || new.status || '.',
      '/candidate/applications',
      jsonb_build_object('applicationId', new.id, 'jobId', new.job_id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists applications_notify_insert on public.applications;
create trigger applications_notify_insert
  after insert on public.applications
  for each row execute function public.notify_application_insert();

drop trigger if exists applications_notify_update on public.applications;
create trigger applications_notify_update
  after update on public.applications
  for each row execute function public.notify_application_update();

-- ---------- interviews ----------
create or replace function public.notify_interview_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_uid uuid;
  job_title text;
begin
  select user_id into candidate_uid from public.applications where id = new.application_id;
  select title into job_title from public.jobs where id = new.job_id;

  if tg_op = 'INSERT' then
    perform public.create_notification(
      candidate_uid, 'interview', 'Interview scheduled',
      'Your ' || coalesce(new.stage, 'interview') || ' for ' || coalesce(job_title, 'a role') ||
      ' is set for ' || coalesce(to_char(new.scheduled_at, 'Mon DD, HH24:MI'), 'a date to confirm') || '.',
      '/candidate/interviews',
      jsonb_build_object('interviewId', new.id, 'jobId', new.job_id)
    );
  elsif new.scheduled_at is distinct from old.scheduled_at
     or new.state is distinct from old.state then
    perform public.create_notification(
      candidate_uid, 'interview', 'Interview updated',
      'Your interview for ' || coalesce(job_title, 'a role') || ' was updated.',
      '/candidate/interviews',
      jsonb_build_object('interviewId', new.id, 'jobId', new.job_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists interviews_notify_change on public.interviews;
create trigger interviews_notify_change
  after insert or update on public.interviews
  for each row execute function public.notify_interview_change();

-- ---------- jobs ----------
create or replace function public.notify_job_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watcher record;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'active' then
    for watcher in select user_id from public.saved_jobs where job_id = new.id loop
      perform public.create_notification(
        watcher.user_id, 'job', 'A saved job is now open',
        new.title || ' is accepting applications.',
        '/candidate/jobs/' || new.id::text,
        jsonb_build_object('jobId', new.id)
      );
    end loop;
  elsif new.status in ('closed', 'archived') then
    for watcher in
      select distinct user_id from public.applications
      where job_id = new.id and status not in ('withdrawn', 'rejected')
      union
      select user_id from public.saved_jobs where job_id = new.id
    loop
      perform public.create_notification(
        watcher.user_id, 'job', 'Job no longer open',
        new.title || ' has been ' || new.status || '.',
        '/candidate/jobs/' || new.id::text,
        jsonb_build_object('jobId', new.id)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_notify_status on public.jobs;
create trigger jobs_notify_status
  after update on public.jobs
  for each row execute function public.notify_job_status_change();

-- ---------- realtime ----------
alter table public.jobs replica identity full;
alter table public.applications replica identity full;
alter table public.application_events replica identity full;
alter table public.application_notes replica identity full;
alter table public.interviews replica identity full;
alter table public.notifications replica identity full;
alter table public.saved_jobs replica identity full;
alter table public.candidate_profiles replica identity full;
alter table public.resumes replica identity full;
alter table public.recruiters replica identity full;

do $$
declare t text;
begin
  foreach t in array array[
    'jobs','applications','application_events','application_notes','interviews',
    'notifications','saved_jobs','candidate_profiles','resumes','recruiters'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- storage policies ----------
drop policy if exists "resumes_owner_select" on storage.objects;
create policy "resumes_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "resumes_owner_insert" on storage.objects;
create policy "resumes_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "resumes_owner_update" on storage.objects;
create policy "resumes_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "resumes_owner_delete" on storage.objects;
create policy "resumes_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "resumes_recruiter_select" on storage.objects;
create policy "resumes_recruiter_select" on storage.objects for select to authenticated
  using (bucket_id = 'resumes'
    and public.is_recruiter_applicant(((storage.foldername(name))[1])::uuid));

drop policy if exists "avatars_owner_select" on storage.objects;
create policy "avatars_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

revoke all on function public.notify_application_insert() from public, anon, authenticated;
revoke all on function public.notify_application_update() from public, anon, authenticated;
revoke all on function public.notify_interview_change() from public, anon, authenticated;
revoke all on function public.notify_job_status_change() from public, anon, authenticated;