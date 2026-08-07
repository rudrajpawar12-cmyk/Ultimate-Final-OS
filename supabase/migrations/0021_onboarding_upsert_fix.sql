begin;

-- ---------------------------------------------------------------------
-- Candidate Profile Fixes
-- ---------------------------------------------------------------------

alter table public.candidate_profiles
    add column if not exists headline text;

create unique index if not exists candidate_profiles_user_id_unique
on public.candidate_profiles(user_id);

-- ---------------------------------------------------------------------
-- Recruiter Fix
-- ---------------------------------------------------------------------

create unique index if not exists recruiters_user_id_unique
on public.recruiters(user_id);

-- ---------------------------------------------------------------------
-- Company Fix
-- ---------------------------------------------------------------------

create unique index if not exists companies_recruiter_id_unique
on public.companies(recruiter_id);

-- ---------------------------------------------------------------------
-- Skills Fix
-- ---------------------------------------------------------------------

create unique index if not exists skills_user_skill_unique
on public.skills(user_id, skill_name);

commit;

notify pgrst, 'reload schema';