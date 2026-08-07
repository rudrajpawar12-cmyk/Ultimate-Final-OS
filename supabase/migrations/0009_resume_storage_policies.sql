-- Backend Phase 4A.3: Resume Storage RLS Policies
-- Scope: storage RLS policies ONLY for the existing private 'resumes' bucket.
-- Out of scope (later phases): repository, service, hooks, UI, upload logic
-- and signed URL generation. No table schema is modified by this migration.
--
-- Depends on: 0008_resume_storage_bucket.sql (creates the private 'resumes' bucket)
--
-- Ownership model:
--   Objects are stored under a per-user prefix: '<auth.uid()>/<file-name>'.
--   Therefore (storage.foldername(name))[1] is the owning user id, and every
--   policy below restricts access to objects whose first path segment matches
--   the authenticated user id. Anonymous roles are never granted access.

-- alter table storage.objects enable row level security;

-- Upload: a user may only create objects inside their own folder.
drop policy if exists "resumes_storage_insert_own" on storage.objects;
create policy "resumes_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Read: a user may only read objects inside their own folder.
drop policy if exists "resumes_storage_select_own" on storage.objects;
create policy "resumes_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Update / overwrite: a user may only update their own objects, and may not
-- move an object outside of their own folder.
drop policy if exists "resumes_storage_update_own" on storage.objects;
create policy "resumes_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Delete: a user may only delete objects inside their own folder.
drop policy if exists "resumes_storage_delete_own" on storage.objects;
create policy "resumes_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );