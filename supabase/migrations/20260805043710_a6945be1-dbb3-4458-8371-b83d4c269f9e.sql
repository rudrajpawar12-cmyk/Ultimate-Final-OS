revoke execute on function public.current_recruiter_id() from anon, public;

-- Saved jobs
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint saved_jobs_user_job_unique unique (user_id, job_id)
);
create index if not exists saved_jobs_user_id_idx on public.saved_jobs (user_id);
grant select, insert, update, delete on public.saved_jobs to authenticated;
grant all on public.saved_jobs to service_role;
alter table public.saved_jobs enable row level security;
create policy "saved_jobs_own_all" on public.saved_jobs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'system',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read = false;
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_own_all" on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- Application timeline events
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
create index if not exists application_events_application_idx on public.application_events (application_id, created_at);
create index if not exists application_events_user_idx on public.application_events (user_id);
grant select, insert on public.application_events to authenticated;
grant all on public.application_events to service_role;
alter table public.application_events enable row level security;
create policy "application_events_select_own" on public.application_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "application_events_insert_own" on public.application_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "application_events_recruiter_select" on public.application_events for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_events.application_id
      and a.recruiter_id = public.current_recruiter_id()
  ));

-- Automatic timeline + notification on application create / status change
create or replace function public.handle_application_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  job_title text;
  company text;
  label text;
begin
  select j.title, coalesce(j.company_name, r.company_name, '')
    into job_title, company
  from public.jobs j
  left join public.recruiters r on r.id = j.recruiter_id
  where j.id = new.job_id;

  label = replace(initcap(replace(new.status, '-', ' ')), ' ', ' ');

  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, user_id, status, title, description, actor)
    values (new.id, new.user_id, new.status, 'Application submitted',
            'You applied for ' || coalesce(job_title, 'this role') ||
            case when company <> '' then ' at ' || company else '' end, 'candidate');

    insert into public.notifications (user_id, title, message, type, link, metadata)
    values (new.user_id, 'Application submitted',
            'Your application for ' || coalesce(job_title, 'a role') || ' was submitted.',
            'application', '/candidate/applications',
            jsonb_build_object('applicationId', new.id, 'jobId', new.job_id, 'status', new.status));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.application_events (application_id, user_id, status, title, description, actor)
    values (new.id, new.user_id, new.status, 'Status changed to ' || label,
            'Your application for ' || coalesce(job_title, 'this role') || ' is now ' || label || '.',
            case when new.status = 'withdrawn' then 'candidate' else 'recruiter' end);

    insert into public.notifications (user_id, title, message, type, link, metadata)
    values (new.user_id, 'Application ' || label,
            coalesce(job_title, 'A role') ||
            case when company <> '' then ' at ' || company else '' end ||
            ' moved to ' || label || '.',
            case when new.status = 'interview' then 'interview' else 'application' end,
            '/candidate/applications',
            jsonb_build_object('applicationId', new.id, 'jobId', new.job_id, 'status', new.status));
  end if;
  return new;
end; $$;
revoke execute on function public.handle_application_activity() from anon, authenticated, public;

create trigger applications_activity_insert after insert on public.applications
  for each row execute function public.handle_application_activity();
create trigger applications_activity_update after update on public.applications
  for each row execute function public.handle_application_activity();

-- Recruiter applicant access helper
create or replace function public.is_recruiter_applicant(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    join public.recruiters r on r.id = a.recruiter_id
    where a.user_id = _user_id and r.user_id = auth.uid()
  )
$$;
revoke execute on function public.is_recruiter_applicant(uuid) from anon, public;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated;

create policy "candidate_profiles_select_recruiter" on public.candidate_profiles for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "experience_select_recruiter" on public.experience for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "education_select_recruiter" on public.education for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "skills_select_recruiter" on public.skills for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "projects_select_recruiter" on public.projects for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "resumes_select_recruiter" on public.resumes for select to authenticated
  using (public.is_recruiter_applicant(user_id));
create policy "resume_analyses_select_recruiter" on public.resume_analyses for select to authenticated
  using (public.is_recruiter_applicant(user_id));

-- Recruiter notes
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  author text not null default 'Recruiter',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists application_notes_application_id_idx on public.application_notes (application_id);
grant select, insert, update, delete on public.application_notes to authenticated;
grant all on public.application_notes to service_role;
alter table public.application_notes enable row level security;
create policy "application_notes_recruiter_all" on public.application_notes for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

-- Interviews
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
grant select, insert, update, delete on public.interviews to authenticated;
grant all on public.interviews to service_role;
alter table public.interviews enable row level security;
create policy "interviews_recruiter_all" on public.interviews for all to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());
create policy "interviews_select_own_candidate" on public.interviews for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = interviews.application_id and a.user_id = auth.uid()
  ));
create trigger interviews_set_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();