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
revoke execute on function public.set_updated_at() from public, anon;
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