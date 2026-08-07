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