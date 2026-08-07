create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  subject_id text not null default '',
  input_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  model_version text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint ai_analyses_unique_subject unique (user_id, kind, subject_id)
);
create index if not exists ai_analyses_lookup_idx on public.ai_analyses(user_id, kind, subject_id);

grant select, insert, update, delete on public.ai_analyses to authenticated;
grant all on public.ai_analyses to service_role;

alter table public.ai_analyses enable row level security;

drop policy if exists "ai_analyses_own_all" on public.ai_analyses;
create policy "ai_analyses_own_all" on public.ai_analyses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "ai_analyses_recruiter_select" on public.ai_analyses;
create policy "ai_analyses_recruiter_select" on public.ai_analyses for select to authenticated
  using (kind = 'applicant-review' and public.is_recruiter_applicant(user_id));

drop trigger if exists ai_analyses_set_updated_at on public.ai_analyses;
create trigger ai_analyses_set_updated_at before update on public.ai_analyses
  for each row execute function public.set_updated_at();