-- Candidate settings
create table if not exists public.candidate_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'English',
  timezone text not null default 'UTC',
  two_factor boolean not null default false,
  job_alerts boolean not null default true,
  weekly_digest boolean not null default true,
  profile_visible boolean not null default true,
  application_updates boolean not null default true,
  interview_reminders boolean not null default true,
  new_matches boolean not null default true,
  product_news boolean not null default false,
  plan text not null default 'free',
  renews_on text not null default '',
  ai_credits_used integer not null default 0,
  ai_credits integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.candidate_settings to authenticated;
grant all on public.candidate_settings to service_role;
alter table public.candidate_settings enable row level security;

create policy "candidate_settings_select_own" on public.candidate_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "candidate_settings_insert_own" on public.candidate_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "candidate_settings_update_own" on public.candidate_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "candidate_settings_delete_own" on public.candidate_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger candidate_settings_set_updated_at
  before update on public.candidate_settings
  for each row execute function public.set_updated_at();

-- Interview prep progress
create table if not exists public.interview_prep_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  practiced boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists interview_prep_progress_user_idx
  on public.interview_prep_progress(user_id);

grant select, insert, update, delete on public.interview_prep_progress to authenticated;
grant all on public.interview_prep_progress to service_role;
alter table public.interview_prep_progress enable row level security;

create policy "interview_prep_select_own" on public.interview_prep_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "interview_prep_insert_own" on public.interview_prep_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "interview_prep_update_own" on public.interview_prep_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "interview_prep_delete_own" on public.interview_prep_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger interview_prep_progress_set_updated_at
  before update on public.interview_prep_progress
  for each row execute function public.set_updated_at();

-- Copilot conversations
create table if not exists public.copilot_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, audience)
);

grant select, insert, update, delete on public.copilot_conversations to authenticated;
grant all on public.copilot_conversations to service_role;
alter table public.copilot_conversations enable row level security;

create policy "copilot_conversations_select_own" on public.copilot_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "copilot_conversations_insert_own" on public.copilot_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "copilot_conversations_update_own" on public.copilot_conversations
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "copilot_conversations_delete_own" on public.copilot_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger copilot_conversations_set_updated_at
  before update on public.copilot_conversations
  for each row execute function public.set_updated_at();