create or replace function public.current_recruiter_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id from public.recruiters r where r.user_id = auth.uid() limit 1
$$;

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

create or replace function public.is_recruiter_applicant(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.recruiters r on r.id = a.recruiter_id
    where a.user_id = _user_id and r.user_id = auth.uid()
  )
$$;

create or replace function public.recruiter_applicant_emails()
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct a.user_id, u.email::text
  from public.applications a
  join public.recruiters r on r.id = a.recruiter_id
  join auth.users u on u.id = a.user_id
  where r.user_id = auth.uid()
$$;

revoke all on function public.current_recruiter_id() from public, anon;
revoke all on function public.is_my_recruiter(uuid) from public, anon;
revoke all on function public.is_recruiter_applicant(uuid) from public, anon;
revoke all on function public.recruiter_applicant_emails() from public, anon;

grant execute on function public.current_recruiter_id() to authenticated, service_role;
grant execute on function public.is_my_recruiter(uuid) to authenticated, service_role;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated, service_role;
grant execute on function public.recruiter_applicant_emails() to authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidate_profiles','skills','education','experience','projects',
    'candidate_preferences','candidate_settings','onboarding_progress',
    'profile_completion','resumes','resume_analyses','ai_analyses',
    'copilot_conversations','interview_prep_progress','notifications',
    'recruiters','companies','jobs','applications','application_events',
    'application_notes','interviews','saved_jobs','application_tags',
    'application_stage_events','recruiter_workspace_settings','job_views'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidate_profiles','skills','education','experience','projects',
    'candidate_preferences','candidate_settings','onboarding_progress',
    'profile_completion','resumes','resume_analyses','ai_analyses',
    'copilot_conversations','interview_prep_progress','notifications',
    'recruiters','saved_jobs','application_events'
  ]
  loop
    execute format('drop policy if exists "%s_own_all" on public.%I', t, t);
    execute format(
      'create policy "%s_own_all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t, t
    );
  end loop;
end $$;

drop policy if exists "companies_recruiter_all" on public.companies;
create policy "companies_recruiter_all" on public.companies for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "jobs_recruiter_all" on public.jobs;
create policy "jobs_recruiter_all" on public.jobs for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "jobs_select_open_candidate" on public.jobs;
create policy "jobs_select_open_candidate" on public.jobs for select to authenticated
  using (status in ('open', 'published', 'active'));

drop policy if exists "companies_select_public_candidate" on public.companies;
create policy "companies_select_public_candidate" on public.companies for select to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.recruiter_id = companies.recruiter_id
        and j.status in ('open', 'published', 'active')
    )
  );

drop policy if exists "application_notes_recruiter_all" on public.application_notes;
create policy "application_notes_recruiter_all" on public.application_notes for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "interviews_recruiter_all" on public.interviews;
create policy "interviews_recruiter_all" on public.interviews for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "interviews_select_own_candidate" on public.interviews;
create policy "interviews_select_own_candidate" on public.interviews for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = interviews.application_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "application_tags_recruiter_all" on public.application_tags;
create policy "application_tags_recruiter_all" on public.application_tags for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "application_stage_events_recruiter_read" on public.application_stage_events;
create policy "application_stage_events_recruiter_read" on public.application_stage_events
  for select to authenticated using (public.is_my_recruiter(recruiter_id));

drop policy if exists "application_stage_events_recruiter_insert" on public.application_stage_events;
create policy "application_stage_events_recruiter_insert" on public.application_stage_events
  for insert to authenticated with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "recruiter_workspace_settings_own_all" on public.recruiter_workspace_settings;
create policy "recruiter_workspace_settings_own_all" on public.recruiter_workspace_settings
  for all to authenticated
  using (public.is_my_recruiter(recruiter_id))
  with check (public.is_my_recruiter(recruiter_id));

drop policy if exists "job_views_insert_authenticated" on public.job_views;
create policy "job_views_insert_authenticated" on public.job_views
  for insert to authenticated with check (true);

drop policy if exists "job_views_recruiter_read" on public.job_views;
create policy "job_views_recruiter_read" on public.job_views for select to authenticated
  using (
    exists (
      select 1 from public.jobs j
      join public.recruiters r on r.id = j.recruiter_id
      where j.id = job_id and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "applications_select_own_candidate" on public.applications;
create policy "applications_select_own_candidate" on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "applications_insert_own_candidate" on public.applications;
create policy "applications_insert_own_candidate" on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "applications_update_own_candidate" on public.applications;
create policy "applications_update_own_candidate" on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "applications_select_recruiter" on public.applications;
create policy "applications_select_recruiter" on public.applications for select to authenticated
  using (recruiter_id = public.current_recruiter_id());

drop policy if exists "applications_update_recruiter" on public.applications;
create policy "applications_update_recruiter" on public.applications for update to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidate_profiles','skills','education','experience','projects',
    'resumes','resume_analyses'
  ]
  loop
    execute format('drop policy if exists "%s_select_recruiter" on public.%I', t, t);
    execute format(
      'create policy "%s_select_recruiter" on public.%I for select to authenticated using (public.is_recruiter_applicant(user_id))',
      t, t
    );
  end loop;
end $$;