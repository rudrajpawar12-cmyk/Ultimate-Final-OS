-- Backend Phase 4A.2: Resume Storage Bucket
-- Scope: creates ONLY the private Supabase Storage bucket used by resume uploads.
-- Out of scope (later phases): storage RLS policies, repository, service, hooks, UI,
-- upload logic and signed URL generation.
--
-- Depends on: 0007_resume_storage.sql (adds public.resumes.storage_path)

-- Private bucket for resume files.
--   public = false  -> objects are never served anonymously; access requires an
--                      authenticated session (policies are added in a later phase).
--   file_size_limit -> 10 MB, matching the resume upload constraints of the app.
--   allowed_mime_types -> documents only (PDF / DOC / DOCX).
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;