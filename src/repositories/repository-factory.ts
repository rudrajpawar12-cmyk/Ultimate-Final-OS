/**
 * Repository factory — central registry for swapping data source implementations.
 *
 * The factory pattern allows the application to switch between:
 * - Local (in-memory/localStorage) repositories for development
 * - Supabase repositories for production
 *
 * This is the ONLY place where the concrete implementation decision is made.
 * Services, hooks, and UI never import concrete repositories directly.
 */

import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { localAuthRepository, type AuthRepository } from "@/repositories/auth.repository";
import { supabaseAuthRepository } from "@/repositories/supabase-auth.repository";
import {
  SupabaseCandidateProfileRepository,
  type CandidateProfileRepository,
} from "@/repositories/supabase-candidate-profile.repository";
import {
  SupabasePreferencesRepository,
  type PreferencesRepository,
} from "@/repositories/supabase-preferences.repository";
import {
  SupabaseResumesRepository,
  type ResumesRepository,
} from "@/repositories/supabase-resumes.repository";
import {
  SupabaseResumeStorageRepository,
  type ResumeStorageRepository,
} from "@/repositories/supabase-resume-storage.repository";
import {
  SupabaseOnboardingRepository,
  type OnboardingRepository,
} from "@/repositories/supabase-onboarding.repository";
import {
  SupabaseProfileCompletionRepository,
  type ProfileCompletionRepository,
} from "@/repositories/supabase-profile-completion.repository";
import type { OnboardingData, OnboardingStepId } from "@/types/candidate";
import type { RecruiterOnboardingData, RecruiterOnboardingStepId } from "@/types/recruiter";

/**
 * All repository interfaces available in the application.
 */
export interface Repositories {
  auth: AuthRepository;
  candidateProfile: CandidateProfileRepository | null;
  preferences: PreferencesRepository | null;
  resumes: ResumesRepository | null;
  resumeStorage: ResumeStorageRepository | null;
  onboarding: OnboardingRepository<OnboardingStepId, OnboardingData> | null;
  recruiterOnboarding: OnboardingRepository<
    RecruiterOnboardingStepId,
    RecruiterOnboardingData
  > | null;
  profileCompletion: ProfileCompletionRepository | null;
  // Future repositories will be added here:
  // recruiter: RecruiterRepository;
  // hiring: HiringRepository;
  // billing: BillingRepository;
  // notification: NotificationRepository;
  // search: SearchRepository;
  // ai: AiRepository;
}

/**
 * Create the local (development) repository set.
 * Uses in-memory/localStorage implementations.
 */
function createLocalRepositories(): Repositories {
  return {
    auth: localAuthRepository,
    candidateProfile: null,
    preferences: null,
    resumes: null,
    resumeStorage: null,
    onboarding: null,
    recruiterOnboarding: null,
    profileCompletion: null,
  };
}

/**
 * Create the Supabase (production) repository set.
 * Wires Supabase-backed implementations where available.
 */
function createSupabaseRepositories(): Repositories {
  const client = getSupabaseClient();
  return {
    auth: supabaseAuthRepository,
    candidateProfile: new SupabaseCandidateProfileRepository(client),
    preferences: new SupabasePreferencesRepository(client),
    resumes: new SupabaseResumesRepository(client),
    resumeStorage: new SupabaseResumeStorageRepository(client),
    onboarding: new SupabaseOnboardingRepository<OnboardingStepId, OnboardingData>(client),
    recruiterOnboarding: new SupabaseOnboardingRepository<
      RecruiterOnboardingStepId,
      RecruiterOnboardingData
    >(client),
    profileCompletion: new SupabaseProfileCompletionRepository(client),
  };
}

/**
 * Singleton repository instances.
 * Automatically selects the correct implementation based on environment config.
 */
let _repositories: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!_repositories) {
    _repositories = isSupabaseConfigured ? createSupabaseRepositories() : createLocalRepositories();
  }
  return _repositories;
}

/**
 * Override repositories for testing.
 * Call with null to reset to default behavior.
 */
export function setRepositories(repos: Repositories | null): void {
  _repositories = repos;
}
