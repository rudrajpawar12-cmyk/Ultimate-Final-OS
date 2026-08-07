-- Backend Phase 5B.1: Company database migration
-- Each company record belongs exclusively to the authenticated recruiter.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  company_name text not null,
  legal_name text,
  company_size text,
  industry text,
  website text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  logo_url text,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Query optimization: all reads are scoped by recruiter.
create index if not exists companies_recruiter_id_idx on public.companies (recruiter_id);

-- Row Level Security: a recruiter may only see and mutate their own companies.
alter table public.companies enable row level security;

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  to authenticated
  using (
    recruiter_id in (
      select id from public.recruiters where user_id = (select auth.uid())
    )
  );

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own"
  on public.companies for insert
  to authenticated
  with check (
    recruiter_id in (
      select id from public.recruiters where user_id = (select auth.uid())
    )
  );

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update
  to authenticated
  using (
    recruiter_id in (
      select id from public.recruiters where user_id = (select auth.uid())
    )
  )
  with check (
    recruiter_id in (
      select id from public.recruiters where user_id = (select auth.uid())
    )
  );

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own"
  on public.companies for delete
  to authenticated
  using (
    recruiter_id in (
      select id from public.recruiters where user_id = (select auth.uid())
    )
  );