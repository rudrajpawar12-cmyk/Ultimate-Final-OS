-- Backend Phase R2: Recruiter read access to applicant data.
--
-- Run this in the Supabase SQL editor after 0017_recruiter_hiring.sql.
--
-- Candidate tables are owner-scoped, so a recruiter cannot read the profile of
-- a candidate who applied to their job. These ADDITIVE select policies grant a
-- recruiter read access to candidate data ONLY for users who have an
-- application against one of that recruiter's jobs. No existing policy is
-- removed.

BEGIN;

-- ---------------------------------------------------------------------------
-- helper: is this user an applicant of the signed-in recruiter?
-- ---------------------------------------------------------------------------
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
    where a.user_id = _user_id
      and r.user_id = auth.uid()
  )
$$;

grant execute on function public.is_recruiter_applicant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- applications: recruiter read + stage updates
-- ---------------------------------------------------------------------------
drop policy if exists "applications_select_recruiter" on public.applications;
create policy "applications_select_recruiter"
  on public.applications for select
  to authenticated
  using (recruiter_id = public.current_recruiter_id());

drop policy if exists "applications_update_recruiter" on public.applications;
create policy "applications_update_recruiter"
  on public.applications for update
  to authenticated
  using (recruiter_id = public.current_recruiter_id())
  with check (recruiter_id = public.current_recruiter_id());

-- ---------------------------------------------------------------------------
-- candidate data: recruiter read for own applicants
-- ---------------------------------------------------------------------------
drop policy if exists "candidate_profiles_select_recruiter" on public.candidate_profiles;
create policy "candidate_profiles_select_recruiter"
  on public.candidate_profiles for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "experience_select_recruiter" on public.experience;
create policy "experience_select_recruiter"
  on public.experience for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "education_select_recruiter" on public.education;
create policy "education_select_recruiter"
  on public.education for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "projects_select_recruiter" on public.projects;
create policy "projects_select_recruiter"
  on public.projects for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "skills_select_recruiter" on public.skills;
create policy "skills_select_recruiter"
  on public.skills for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "resumes_select_recruiter" on public.resumes;
create policy "resumes_select_recruiter"
  on public.resumes for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

drop policy if exists "resume_analyses_select_recruiter" on public.resume_analyses;
create policy "resume_analyses_select_recruiter"
  on public.resume_analyses for select
  to authenticated
  using (public.is_recruiter_applicant(user_id));

-- ---------------------------------------------------------------------------
-- applicant contact emails (auth.users is not exposed to the Data API)
-- ---------------------------------------------------------------------------
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

grant execute on function public.recruiter_applicant_emails() to authenticated;

COMMIT;
