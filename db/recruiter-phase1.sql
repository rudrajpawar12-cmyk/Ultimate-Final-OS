-- Recruiter module — Phase 1 production tables.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Additive only: no existing table or column is modified.
--
--   application_tags             recruiter-defined labels on an application
--   application_stage_events     immutable pipeline stage history
--   recruiter_workspace_settings persisted workspace settings blob
--   job_views                    raw job view events (counted live)

-- Helper: is the given recruiters.id owned by the current user?
create or replace function public.is_my_recruiter(_recruiter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recruiters r
    where r.id = _recruiter_id and r.user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_my_recruiter(uuid) to authenticated;

-- ---------------------------------------------------------------- tags -----
create table if not exists public.application_tags (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (application_id, tag)
);
create index if not exists application_tags_application_id_idx
  on public.application_tags (application_id);
create index if not exists application_tags_recruiter_id_idx
  on public.application_tags (recruiter_id);

grant select, insert, update, delete on public.application_tags to authenticated;
grant all on public.application_tags to service_role;
alter table public.application_tags enable row level security;
drop policy if exists "application_tags_recruiter_all" on public.application_tags;
create policy "application_tags_recruiter_all" on public.application_tags for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

-- ------------------------------------------------------- stage history -----
create table if not exists public.application_stage_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  actor text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists application_stage_events_application_id_idx
  on public.application_stage_events (application_id, created_at desc);

grant select, insert on public.application_stage_events to authenticated;
grant all on public.application_stage_events to service_role;
alter table public.application_stage_events enable row level security;
drop policy if exists "application_stage_events_recruiter_read" on public.application_stage_events;
create policy "application_stage_events_recruiter_read" on public.application_stage_events
  for select to authenticated using (public.is_my_recruiter(recruiter_id));
drop policy if exists "application_stage_events_recruiter_insert" on public.application_stage_events;
create policy "application_stage_events_recruiter_insert" on public.application_stage_events
  for insert to authenticated with check (public.is_my_recruiter(recruiter_id));

-- ---------------------------------------------------- workspace settings ----
create table if not exists public.recruiter_workspace_settings (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null unique references public.recruiters (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

grant select, insert, update, delete on public.recruiter_workspace_settings to authenticated;
grant all on public.recruiter_workspace_settings to service_role;
alter table public.recruiter_workspace_settings enable row level security;
drop policy if exists "recruiter_workspace_settings_own_all" on public.recruiter_workspace_settings;
create policy "recruiter_workspace_settings_own_all" on public.recruiter_workspace_settings
  for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop trigger if exists recruiter_workspace_settings_set_updated_at
  on public.recruiter_workspace_settings;
create trigger recruiter_workspace_settings_set_updated_at
  before update on public.recruiter_workspace_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- job views -----
create table if not exists public.job_views (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  viewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists job_views_job_id_idx on public.job_views (job_id);

grant select, insert on public.job_views to authenticated;
grant all on public.job_views to service_role;
alter table public.job_views enable row level security;
-- Any signed-in user may record a view; only the owning recruiter can read them.
drop policy if exists "job_views_insert_authenticated" on public.job_views;
create policy "job_views_insert_authenticated" on public.job_views
  for insert to authenticated with check (true);
drop policy if exists "job_views_recruiter_read" on public.job_views;
create policy "job_views_recruiter_read" on public.job_views
  for select to authenticated using (
    exists (
      select 1 from public.jobs j
      join public.recruiters r on r.id = j.recruiter_id
      where j.id = job_id and r.user_id = (select auth.uid())
    )
  );
