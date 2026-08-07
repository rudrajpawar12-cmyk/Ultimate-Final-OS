alter table public.recruiters
  add column if not exists job_title text not null default '',
  add column if not exists department text,
  add column if not exists company_logo_url text,
  add column if not exists company_industry text,
  add column if not exists company_size text,
  add column if not exists company_headquarters text,
  add column if not exists hiring_roles text[] not null default '{}'::text[],
  add column if not exists hiring_locations text[] not null default '{}'::text[],
  add column if not exists work_modes text[] not null default '{}'::text[];