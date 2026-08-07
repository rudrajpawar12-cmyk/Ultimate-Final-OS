create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  headline text,
  bio text,
  location text,
  phone text,
  profile_photo_url text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  twitter_url text,
  website_url text,
  profile_views integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_name text not null,
  category text,
  proficiency_level text not null default 'intermediate',
  years_of_experience integer,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint skills_user_name_unique unique (user_id, skill_name)
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null default '',
  degree text not null default '',
  field_of_study text,
  grade text,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null default '',
  job_title text not null default '',
  employment_type text,
  location text,
  description text,
  start_date date,
  end_date date,
  currently_working boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  description text,
  technologies text[] not null default '{}'::text[],
  github_url text,
  live_url text,
  start_date date,
  end_date date,
  currently_active boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  desired_roles text[] not null default '{}'::text[],
  locations text[] not null default '{}'::text[],
  work_mode text not null default 'remote',
  min_salary integer not null default 0,
  notice_period text,
  open_to_relocate boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.candidate_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  renews_on date not null default (current_date + interval '30 days'),
  ai_credits integer not null default 50,
  ai_credits_used integer not null default 0,
  language text not null default 'en',
  timezone text not null default 'UTC',
  profile_visible boolean not null default true,
  job_alerts boolean not null default true,
  new_matches boolean not null default true,
  application_updates boolean not null default true,
  interview_reminders boolean not null default true,
  weekly_digest boolean not null default true,
  product_news boolean not null default false,
  two_factor boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  current_step text not null default 'welcome',
  completed_steps text[] not null default '{}'::text[],
  onboarding_data jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.profile_completion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  percentage integer not null default 0,
  completed_sections text[] not null default '{}'::text[],
  incomplete_sections text[] not null default '{}'::text[],
  missing_fields text[] not null default '{}'::text[],
  section_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null default '',
  original_file_name text not null default '',
  mime_type text not null default 'application/pdf',
  file_size numeric not null default 0,
  storage_path text,
  is_active boolean not null default false,
  uploaded_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null references public.resumes (id) on delete cascade,
  status text not null default 'pending',
  overall_score integer not null default 0,
  ats_compatibility numeric,
  section_scores jsonb not null default '{}'::jsonb,
  keyword_analysis jsonb,
  raw_analysis jsonb,
  strengths text[] not null default '{}'::text[],
  weaknesses text[] not null default '{}'::text[],
  suggestions text[] not null default '{}'::text[],
  target_role text,
  model_version text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  subject_id uuid not null default gen_random_uuid(),
  input_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  model_version text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.copilot_conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  audience text not null default 'candidate',
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, audience)
);

create table if not exists public.interview_prep_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null,
  practiced boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint interview_prep_progress_unique unique (user_id, question_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'system',
  title text not null default '',
  message text not null default '',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.recruiters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  job_title text not null default '',
  designation text,
  department text,
  work_email text,
  phone text,
  linkedin_url text,
  bio text,
  profile_photo_url text,
  company_name text,
  company_website text,
  company_industry text,
  company_size text,
  company_headquarters text,
  company_logo_url text,
  hiring_roles text[] not null default '{}'::text[],
  hiring_locations text[] not null default '{}'::text[],
  work_modes text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null unique references public.recruiters (id) on delete cascade,
  company_name text not null default '',
  legal_name text,
  website text,
  email text,
  phone text,
  industry text,
  company_size text,
  description text,
  logo_url text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.recruiters (id) on delete cascade,
  title text not null default '',
  department text,
  description text not null default '',
  requirements text,
  responsibilities text,
  benefits text,
  company_name text,
  location text,
  workplace_type text,
  employment_type text,
  experience_level text,
  min_experience numeric,
  max_experience numeric,
  min_salary integer,
  max_salary integer,
  currency text,
  skills text[] not null default '{}'::text[],
  status text not null default 'draft',
  application_deadline text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  recruiter_id uuid references public.recruiters (id) on delete set null,
  resume_id uuid references public.resumes (id) on delete set null,
  cover_letter text,
  status text not null default 'applied',
  source text not null default 'direct',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  title text not null,
  description text,
  actor text not null default 'system',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  author text not null default 'Recruiter',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

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

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);

create table if not exists public.application_tags (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (application_id, tag)
);

create table if not exists public.application_stage_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  actor text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.recruiter_workspace_settings (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null unique references public.recruiters (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.job_views (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  viewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists skills_user_id_idx on public.skills (user_id);
create index if not exists education_user_id_idx on public.education (user_id);
create index if not exists experience_user_id_idx on public.experience (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resume_analyses_user_id_idx on public.resume_analyses (user_id);
create index if not exists resume_analyses_resume_id_idx on public.resume_analyses (resume_id);
create index if not exists ai_analyses_user_kind_idx on public.ai_analyses (user_id, kind);
create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_recruiter_id_idx on public.applications (recruiter_id);
create index if not exists applications_job_id_idx on public.applications (job_id);
create index if not exists applications_status_idx on public.applications (status);
create unique index if not exists applications_user_job_unique on public.applications (user_id, job_id);
create index if not exists application_events_application_id_idx on public.application_events (application_id);
create index if not exists application_notes_application_id_idx on public.application_notes (application_id);
create index if not exists interviews_recruiter_id_idx on public.interviews (recruiter_id);
create index if not exists interviews_application_id_idx on public.interviews (application_id);
create index if not exists jobs_recruiter_id_idx on public.jobs (recruiter_id);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists saved_jobs_user_id_idx on public.saved_jobs (user_id);
create index if not exists job_views_job_id_idx on public.job_views (job_id);
create index if not exists application_tags_application_id_idx on public.application_tags (application_id);
create index if not exists application_stage_events_application_id_idx
  on public.application_stage_events (application_id, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidate_profiles','skills','education','experience','projects',
    'candidate_preferences','candidate_settings','onboarding_progress',
    'profile_completion','resumes','resume_analyses','ai_analyses',
    'interview_prep_progress','notifications','recruiters','companies','jobs',
    'applications','interviews','recruiter_workspace_settings'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;