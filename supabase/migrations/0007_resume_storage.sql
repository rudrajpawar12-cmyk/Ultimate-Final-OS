-- Backend Phase 4A.1: Resume Storage Database Migration
-- Adds the minimum metadata required for future Supabase Storage integration.
-- Scope: schema only. No storage bucket, no storage policies, no application code.

-- Object path of the uploaded file inside the storage bucket.
-- Nullable so that pre-existing metadata-only resume rows remain valid.
alter table public.resumes
  add column if not exists storage_path text;

-- Query optimization: allows resolving a resume row from its storage object path.
create index if not exists resumes_storage_path_idx
  on public.resumes (storage_path)
  where storage_path is not null;

-- Documentation for future storage integration phases.
comment on column public.resumes.storage_path is
  'Object path of the resume file within the storage bucket. Null for metadata-only records created before storage integration.';