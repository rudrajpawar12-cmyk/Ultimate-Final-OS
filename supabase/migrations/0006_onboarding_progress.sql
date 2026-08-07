-- Backend Phase 3H: Onboarding Progress persistence
-- Each onboarding_progress record belongs exclusively to the authenticated user.
-- A user has exactly one onboarding progress record (1:1 relationship).

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  current_step text not null default 'welcome',
  completed_steps text[] not null default '{}',
  onboarding_data jsonb not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint onboarding_progress_user_unique unique (user_id)
);

-- Query optimization: reads are scoped by user.
create index if not exists onboarding_progress_user_id_idx on public.onboarding_progress (user_id);

-- Row Level Security: a user may only see and mutate their own record.
alter table public.onboarding_progress enable row level security;

drop policy if exists "onboarding_progress_select_own" on public.onboarding_progress;
create policy "onboarding_progress_select_own"
  on public.onboarding_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "onboarding_progress_insert_own" on public.onboarding_progress;
create policy "onboarding_progress_insert_own"
  on public.onboarding_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "onboarding_progress_update_own" on public.onboarding_progress;
create policy "onboarding_progress_update_own"
  on public.onboarding_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "onboarding_progress_delete_own" on public.onboarding_progress;
create policy "onboarding_progress_delete_own"
  on public.onboarding_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);