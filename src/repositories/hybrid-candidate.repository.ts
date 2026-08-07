/**
 * Hybrid Candidate Repository
 *
 * The candidate module is fully Supabase-backed: every method below is served
 * by `SupabaseCandidateRepository` reading from the live database.
 *
 * The local (fixture) repository is only used when Supabase is not configured
 * at all, so the app still boots in a bare development environment.
 */

import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

import {
  localCandidateRepository,
  type CandidateRepository,
} from "@/repositories/candidate.repository";

import { SupabaseCandidateRepository } from "@/repositories/supabase/supabase-candidate.repository";

function createHybridCandidateRepository(): CandidateRepository {
  if (!isSupabaseConfigured) {
    return localCandidateRepository;
  }

  const supabase = new SupabaseCandidateRepository(getSupabaseClient());

  return {
    // ---------------- Dashboard ----------------
    getDashboard: () => supabase.getDashboard(),

    // ---------------- Profile ----------------
    getProfile: () => supabase.getProfile(),
    updateProfile: (patch) => supabase.updateProfile(patch),

    // ---------------- Resumes ----------------
    getResumes: () => supabase.getResumes(),
    uploadResume: (file) => supabase.uploadResume(file),
    deleteResume: (id) => supabase.deleteResume(id),
    setActiveResume: (id) => supabase.setActiveResume(id),

    // ---------------- Resume analysis ----------------
    getAnalyses: () => supabase.getAnalyses(),
    analyzeResume: (resumeId) => supabase.analyzeResume(resumeId),

    // ---------------- Skill gap ----------------
    getSkillGap: (targetRole) => supabase.getSkillGap(targetRole),

    // ---------------- Jobs ----------------
    getJobs: (filters) => supabase.getJobs(filters),
    getJob: (id) => supabase.getJob(id),
    toggleSavedJob: (id) => supabase.toggleSavedJob(id),

    // ---------------- Applications ----------------
    getApplications: () => supabase.getApplications(),
    applyToJob: (jobId, options) => supabase.applyToJob(jobId, options),
    withdrawApplication: (applicationId) => supabase.withdrawApplication(applicationId),

    // ---------------- Interviews ----------------
    getInterviews: () => supabase.getInterviews(),

    // ---------------- Interview prep ----------------
    getPrepOverview: () => supabase.getPrepOverview(),
    togglePracticed: (questionId) => supabase.togglePracticed(questionId),

    // ---------------- Analytics ----------------
    getAnalytics: () => supabase.getAnalytics(),

    // ---------------- Settings ----------------
    getSettings: () => supabase.getSettings(),
    updateSettings: (patch) => supabase.updateSettings(patch),

    // ---------------- Onboarding ----------------
    getOnboardingState: () => supabase.getOnboardingState(),
    saveOnboardingState: (state) => supabase.saveOnboardingState(state),
    resetOnboarding: () => supabase.resetOnboarding(),
  };
}

export const hybridCandidateRepository = createHybridCandidateRepository();
