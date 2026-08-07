-- Migration: Profile Completion table
-- Backend Phase X5: Profile completion database migration

BEGIN;

-- Create profile_completion table
CREATE TABLE IF NOT EXISTS public.profile_completion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL DEFAULT 0,
  completed_sections TEXT[] NOT NULL DEFAULT '{}',
  incomplete_sections TEXT[] NOT NULL DEFAULT '{}',
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  section_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_completion_user_unique UNIQUE (user_id)
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profile_completion_user_id ON public.profile_completion(user_id);

-- Enable Row Level Security
ALTER TABLE public.profile_completion ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can only access their own records
DROP POLICY IF EXISTS "Users can select their own profile completion"
ON public.profile_completion;

CREATE POLICY "Users can select their own profile completion"
  ON public.profile_completion
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile completion"
ON public.profile_completion;

CREATE POLICY "Users can insert their own profile completion"
  ON public.profile_completion
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile completion"
ON public.profile_completion;

CREATE POLICY "Users can update their own profile completion"
  ON public.profile_completion
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile completion"
ON public.profile_completion;

CREATE POLICY "Users can delete their own profile completion"
  ON public.profile_completion
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;