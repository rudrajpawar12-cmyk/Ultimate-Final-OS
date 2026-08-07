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

  if new.status in ('open', 'published', 'active') then
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

revoke all on function public.notify_application_insert() from public, anon, authenticated;
revoke all on function public.notify_application_update() from public, anon, authenticated;
revoke all on function public.notify_interview_change() from public, anon, authenticated;
revoke all on function public.notify_job_status_change() from public, anon, authenticated;

alter table public.jobs replica identity full;
alter table public.applications replica identity full;
alter table public.application_events replica identity full;
alter table public.application_notes replica identity full;
alter table public.interviews replica identity full;
alter table public.notifications replica identity full;
alter table public.saved_jobs replica identity full;
alter table public.candidate_profiles replica identity full;
alter table public.resumes replica identity full;

do $$
declare t text;
begin
  foreach t in array array[
    'jobs','applications','application_events','application_notes','interviews',
    'notifications','saved_jobs','candidate_profiles','resumes'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

drop policy if exists "resumes_objects_own_all" on storage.objects;
create policy "resumes_objects_own_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "resumes_objects_recruiter_read" on storage.objects;
create policy "resumes_objects_recruiter_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_recruiter_applicant(((storage.foldername(name))[1])::uuid)
  );