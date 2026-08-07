import {
  emptyRecruiterOnboardingState,
  localRecruiterRepository,
  type RecruiterRepository,
} from "@/repositories/recruiter.repository";
import { buildCompletionReport } from "@/services/completion.service";
import type { OnboardingStepMeta } from "@/types/onboarding";
import type {
  RecruiterOnboardingData,
  RecruiterOnboardingState,
  RecruiterOnboardingStepId,
} from "@/types/recruiter";
import type {
  RecruiterProfileDTO,
  RecruiterProfileRepository,
  CreateRecruiterProfileInput,
  UpdateRecruiterProfileInput,
} from "@/repositories/supabase-recruiter.repository";
import { SupabaseRecruiterRepository } from "@/repositories/supabase-recruiter.repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { AppError } from "@/lib/errors";

export const RECRUITER_ONBOARDING_STEPS: OnboardingStepMeta<RecruiterOnboardingStepId>[] = [
  {
    id: "welcome",
    title: "Welcome",
    description: "How your hiring workspace comes together",
  },
  {
    id: "company",
    title: "Company information",
    description: "The organisation candidates will see",
  },
  { id: "logo", title: "Company logo", description: "Brand your job posts", skippable: true },
  {
    id: "website",
    title: "Website & links",
    description: "Where candidates verify you",
    skippable: true,
  },
  { id: "industry", title: "Industry", description: "What your company does" },
  { id: "size", title: "Company size", description: "Headcount and hiring volume" },
  { id: "hiring", title: "Hiring preferences", description: "Who you're hiring and how" },
  { id: "profile", title: "Recruiter profile", description: "How candidates reach you" },
  { id: "complete", title: "All set", description: "Enter your workspace", terminal: true },
];

export const COMPANY_SIZES = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1,000",
  "1,000–5,000",
  "5,000+",
];

export const HIRING_VOLUMES = [
  "1–5 hires per quarter",
  "6–20 hires per quarter",
  "21–50 hires per quarter",
  "50+ hires per quarter",
];

export const INDUSTRIES = [
  "Software & IT services",
  "Product & SaaS",
  "Financial services",
  "Healthcare & life sciences",
  "E-commerce & retail",
  "Manufacturing",
  "Education",
  "Consulting",
  "Media & entertainment",
  "Public sector",
];

export const SENIORITY_LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Executive"];

/**
 * Service layer: recruiter business rules live here, never in components.
 * UI -> Hooks -> Services -> Repository -> Data source.
 */
export function createRecruiterService(repository: RecruiterRepository = localRecruiterRepository) {
  const service = {
    getOnboardingState: () => repository.getOnboardingState(),
    saveOnboardingState: (state: RecruiterOnboardingState) => repository.saveOnboardingState(state),
    resetOnboarding: () => repository.resetOnboarding(),

    emptyOnboardingState: () =>
      JSON.parse(JSON.stringify(emptyRecruiterOnboardingState)) as RecruiterOnboardingState,

    stepIndex(step: RecruiterOnboardingStepId) {
      return Math.max(
        0,
        RECRUITER_ONBOARDING_STEPS.findIndex((item) => item.id === step),
      );
    },

    validateStep(step: RecruiterOnboardingStepId, data: RecruiterOnboardingData): string | null {
      if (step === "company") {
        const name = data.company?.name?.trim() ?? "";
        if (name.length < 2) return "Enter your company name.";
        if (name.length > 120) return "Company name is too long.";
        const description = data.company?.description?.trim() ?? "";
        if (description.length > 0 && description.length < 20) {
          return "Add at least 20 characters to the company description, or leave it empty.";
        }
      }
      if (step === "website") {
        const invalid = [data.links?.website, data.links?.careersPage, data.links?.linkedin]
          .filter(Boolean)
          .find((url) => !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/.test(url as string));
        if (invalid) return "Links must start with http:// or https:// and be a valid URL.";
      }
      if (step === "industry" && !data.industry?.primary) {
        return "Select the industry that best describes your company.";
      }
      if (step === "size" && !data.scale?.employees) {
        return "Select your company size.";
      }
      if (step === "hiring") {
        if (!data.hiring?.roles?.length) return "Add at least one role you're hiring for.";
        if (!data.hiring?.workModes?.length) return "Select at least one work mode.";
      }
      if (step === "profile") {
        if ((data.recruiter?.fullName?.trim().length ?? 0) < 2) return "Enter your full name.";
        if ((data.recruiter?.jobTitle?.trim().length ?? 0) < 2) return "Enter your job title.";
        const email = data.recruiter?.workEmail?.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          return "Enter a valid work email.";
        }
      }
      return null;
    },

    /** Reusable profile completion engine input for recruiters. */
    completion(data: RecruiterOnboardingData) {
      return buildCompletionReport([
        {
          id: "company",
          label: "Company profile",
          hint: "Name, description and headquarters",
          weight: 3,
          done: Boolean(data.company?.name && data.company?.description),
        },
        {
          id: "logo",
          label: "Company logo",
          hint: "Branded job posts get more applicants",
          weight: 1,
          done: Boolean(data.logoDataUrl),
        },
        {
          id: "industry",
          label: "Industry",
          hint: "Helps us match relevant candidates",
          weight: 2,
          done: Boolean(data.industry?.primary),
        },
        {
          id: "size",
          label: "Company size",
          hint: "Headcount and hiring volume",
          weight: 1,
          done: Boolean(data.scale?.employees),
        },
        {
          id: "hiring",
          label: "Hiring preferences",
          hint: "Roles, locations and work modes",
          weight: 3,
          done: Boolean(data.hiring?.roles?.length && data.hiring?.workModes?.length),
        },
        {
          id: "profile",
          label: "Recruiter profile",
          hint: "Your name and job title",
          weight: 2,
          done: Boolean(data.recruiter?.fullName && data.recruiter?.jobTitle),
        },
      ]);
    },

    isOnboardingComplete(state: RecruiterOnboardingState) {
      return state.completedSteps.includes("profile") || state.currentStep === "complete";
    },
  };

  return service;
}

export const recruiterService = createRecruiterService();
export type RecruiterService = ReturnType<typeof createRecruiterService>;

/* ─────────────────────────────────────────────────────────────────────────────
 * Recruiter Profile CRUD Service
 *
 * Business logic layer for recruiter profile persistence operations.
 * Delegates data access to RecruiterProfileRepository.
 *
 * UI → Hooks → Service → Repository → Supabase
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Creates a RecruiterProfileService bound to the active repository implementation.
 */
export function createRecruiterProfileService(
  repository?: RecruiterProfileRepository,
) {
  const repo = repository ?? getDefaultRecruiterProfileRepository();

  return {
    /**
     * Create a new recruiter profile for the current user.
     * Validates required fields before persisting.
     */
    async createProfile(input: CreateRecruiterProfileInput): Promise<RecruiterProfileDTO> {
      if (!input.fullName || input.fullName.trim().length < 2) {
        throw new AppError(
          "Full name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (!input.jobTitle || input.jobTitle.trim().length < 2) {
        throw new AppError(
          "Job title must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo.create({
        ...input,
        fullName: input.fullName.trim(),
        jobTitle: input.jobTitle.trim(),
        department: input.department?.trim() || null,
        workEmail: input.workEmail?.trim() || null,
        phone: input.phone?.trim() || null,
        companyName: input.companyName?.trim() || null,
        companyLogoUrl: input.companyLogoUrl?.trim() || null,
        companyWebsite: input.companyWebsite?.trim() || null,
        companyIndustry: input.companyIndustry?.trim() || null,
        companySize: input.companySize?.trim() || null,
        companyHeadquarters: input.companyHeadquarters?.trim() || null,
        hiringRoles: input.hiringRoles ?? [],
        hiringLocations: input.hiringLocations ?? [],
        workModes: input.workModes ?? [],
      });
    },

    /**
     * Get the current user's recruiter profile.
     * Returns null if no profile has been created yet.
     */
    async getProfile(): Promise<RecruiterProfileDTO | null> {
      return repo.getByUserId();
    },

    /**
     * Update the current user's recruiter profile.
     * Only provided fields are updated; others remain unchanged.
     */
    async updateProfile(input: UpdateRecruiterProfileInput): Promise<RecruiterProfileDTO> {
      if (input.fullName !== undefined && input.fullName.trim().length < 2) {
        throw new AppError(
          "Full name must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      if (input.jobTitle !== undefined && input.jobTitle.trim().length < 2) {
        throw new AppError(
          "Job title must be at least 2 characters",
          "VALIDATION_ERROR",
          422,
        );
      }
      return repo.update({
        ...(input.fullName !== undefined && { fullName: input.fullName.trim() }),
        ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle.trim() }),
        ...(input.department !== undefined && { department: input.department?.trim() || null }),
        ...(input.workEmail !== undefined && { workEmail: input.workEmail?.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.companyName !== undefined && { companyName: input.companyName?.trim() || null }),
        ...(input.companyLogoUrl !== undefined && { companyLogoUrl: input.companyLogoUrl?.trim() || null }),
        ...(input.companyWebsite !== undefined && { companyWebsite: input.companyWebsite?.trim() || null }),
        ...(input.companyIndustry !== undefined && { companyIndustry: input.companyIndustry?.trim() || null }),
        ...(input.companySize !== undefined && { companySize: input.companySize?.trim() || null }),
        ...(input.companyHeadquarters !== undefined && { companyHeadquarters: input.companyHeadquarters?.trim() || null }),
        ...(input.hiringRoles !== undefined && { hiringRoles: input.hiringRoles }),
        ...(input.hiringLocations !== undefined && { hiringLocations: input.hiringLocations }),
        ...(input.workModes !== undefined && { workModes: input.workModes }),
      });
    },

    /**
     * Delete the current user's recruiter profile.
     */
    async deleteProfile(): Promise<void> {
      return repo.delete();
    },
  };
}

/**
 * Returns the default repository based on environment configuration.
 */
function getDefaultRecruiterProfileRepository(): RecruiterProfileRepository {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "Supabase is not configured. Recruiter profile persistence requires Supabase.",
      "SERVER_ERROR",
      500,
    );
  }
  const client = getSupabaseClient();
  return new SupabaseRecruiterRepository(client);
}

/** Singleton service instance for recruiter profile CRUD */
export const recruiterProfileService = createRecruiterProfileService();
export type RecruiterProfileService = ReturnType<typeof createRecruiterProfileService>;
