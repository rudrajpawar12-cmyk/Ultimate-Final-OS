/**
 * Hybrid Hiring Repository
 *
 * Delegates the whole recruiter hiring domain — Jobs, Applicants, Pipeline
 * stages, Notes, Interviews, Dashboard overview, Analytics and AI ranking —
 * to SupabaseHiringRepository (real DB, scoped to the authenticated
 * recruiter). Only the workspace settings blob stays on the local repository,
 * because recruiter/company settings are persisted through the recruiter and
 * company repositories (see use-recruiter / use-company).
 *
 * Architecture: Repository → Service → Hook → UI (unchanged).
 */

import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import {
  localHiringRepository,
  type HiringRepository,
} from "@/repositories/hiring.repository";
import { SupabaseHiringRepository } from "@/repositories/supabase/supabase-hiring.repository";
import type {
  AiWorkspaceResult,
  Applicant,
  HiringOverview,
  Interview,
  Job,
  JobDraft,
  JobStatus,
  PipelineStage,
  RecruiterAnalytics,
  RecruiterSettings,
} from "@/types/hiring";


function createHybridHiringRepository(): HiringRepository {
  // When Supabase is not configured, fall back entirely to local fixtures
  if (!isSupabaseConfigured) {
    return localHiringRepository;
  }

  const supabaseHiring = new SupabaseHiringRepository(getSupabaseClient());

  return {
    // --- Supabase-backed Job operations (scoped to authenticated recruiter) ---
    listJobs(): Promise<Job[]> {
      return supabaseHiring.listJobs();
    },
    getJob(id: string): Promise<Job | null> {
      return supabaseHiring.getJob(id);
    },
    createJob(draft: JobDraft): Promise<Job> {
      return supabaseHiring.createJob(draft);
    },
    updateJob(id: string, patch: Partial<JobDraft>): Promise<Job> {
      return supabaseHiring.updateJob(id, patch);
    },
    duplicateJob(id: string): Promise<Job> {
      return supabaseHiring.duplicateJob(id);
    },
    setJobStatus(id: string, status: JobStatus): Promise<Job> {
      return supabaseHiring.setJobStatus(id, status);
    },
    deleteJob(id: string): Promise<{ id: string }> {
      return supabaseHiring.deleteJob(id);
    },

    // --- Supabase-backed Applicants & pipeline (Phase 5.2 – 5.4) ---
    listApplicants(): Promise<Applicant[]> {
      return supabaseHiring.listApplicants();
    },
    getApplicant(id: string): Promise<Applicant | null> {
      return supabaseHiring.getApplicant(id);
    },
    setApplicantStage(id: string, stage: PipelineStage): Promise<Applicant> {
      return supabaseHiring.setApplicantStage(id, stage);
    },
    bulkSetApplicantStage(ids: string[], stage: PipelineStage): Promise<Applicant[]> {
      return supabaseHiring.bulkSetApplicantStage(ids, stage);
    },
    addApplicantNote(id: string, body: string): Promise<Applicant> {
      return supabaseHiring.addApplicantNote(id, body);
    },
    addApplicantTag(id: string, tag: string): Promise<Applicant> {
      return supabaseHiring.addApplicantTag(id, tag);
    },
    removeApplicantTag(id: string, tag: string): Promise<Applicant> {
      return supabaseHiring.removeApplicantTag(id, tag);
    },

    // --- Supabase-backed Interviews (Phase 5.6) ---
    listInterviews(): Promise<Interview[]> {
      return supabaseHiring.listInterviews();
    },
    saveInterview(interview: Interview): Promise<Interview> {
      return supabaseHiring.saveInterview(interview);
    },

    // --- Supabase-backed Dashboard, Analytics & AI workspace (5.5, 5.7, 5.8) ---
    getOverview(): Promise<HiringOverview> {
      return supabaseHiring.getOverview();
    },
    getAnalytics(): Promise<RecruiterAnalytics> {
      return supabaseHiring.getAnalytics();
    },
    runAiRanking(jobId: string): Promise<AiWorkspaceResult> {
      return supabaseHiring.runAiRanking(jobId);
    },
    generateScreeningQuestions(jobId: string, brief: string): Promise<string[]> {
      return supabaseHiring.generateScreeningQuestions(jobId, brief);
    },

    // --- Workspace settings persisted in recruiter_workspace_settings ---
    getSettings(): Promise<RecruiterSettings> {
      return supabaseHiring.getSettings();
    },
    saveSettings(settings: RecruiterSettings): Promise<RecruiterSettings> {
      return supabaseHiring.saveSettings(settings);
    },
  };
}

export const hybridHiringRepository: HiringRepository =
  createHybridHiringRepository();