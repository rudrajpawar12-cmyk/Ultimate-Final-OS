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
create policy "recruiters_own_all" on public.recruiters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "candidate_profiles_own_all" on public.candidate_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "companies_recruiter_all" on public.companies for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
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
create policy "jobs_recruiter_all" on public.jobs for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
create policy "jobs_select_open_candidate" on public.jobs for select to authenticated
  using (status in ('open','published','active'));
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

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
create policy "resumes_own_all" on public.resumes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "applications_select_own_candidate" on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "applications_insert_own_candidate" on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "applications_withdraw_own_candidate" on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'withdrawn');
create policy "applications_select_recruiter" on public.applications for select to authenticated
  using (recruiter_id = public.current_recruiter_id());
create policy "applications_update_recruiter" on public.applications for update to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
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

-- ============ application_events (candidate timeline) ============
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
create policy "application_events_own_select" on public.application_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "application_events_own_insert" on public.application_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "application_events_recruiter_select" on public.application_events for select to authenticated
  using (public.is_recruiter_applicant(user_id));

-- ============ application_notes (recruiter) ============
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
create policy "interviews_recruiter_all" on public.interviews for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
create policy "interviews_select_own_candidate" on public.interviews for select to authenticated
  using (exists (select 1 from public.applications a
    where a.id = interviews.application_id and a.user_id = (select auth.uid())));
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
create policy "resume_analyses_own_all" on public.resume_analyses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "skills_own_all" on public.skills for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "education_own_all" on public.education for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "experience_own_all" on public.experience for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "projects_own_all" on public.projects for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- recruiter read access to their applicants' data
create policy "candidate_profiles_select_recruiter" on public.candidate_profiles for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "experience_select_recruiter" on public.experience for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "education_select_recruiter" on public.education for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "projects_select_recruiter" on public.projects for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "skills_select_recruiter" on public.skills for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "resumes_select_recruiter" on public.resumes for select to authenticated
  using (public.is_recruiter_applicant(user_id));
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
create policy "candidate_preferences_own_all" on public.candidate_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "notifications_own_all" on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "onboarding_progress_own_all" on public.onboarding_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
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
create policy "profile_completion_own_all" on public.profile_completion for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger profile_completion_set_updated_at before update on public.profile_completion
  for each row execute function public.set_updated_at();