import {
  localCandidateRepository,
  emptyOnboardingState,
  type ApplyOptions,
  type CandidateRepository,
} from "@/repositories/candidate.repository";


import { hybridCandidateRepository } from "@/repositories/hybrid-candidate.repository";
import { buildCompletionReport } from "@/services/completion.service";
import type { CompletionReport, OnboardingStepMeta } from "@/types/onboarding";
import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  CandidateSettings,
  Job,
  JobFilters,
  OnboardingData,
  OnboardingState,
  OnboardingStepId,
  ProfileCompletion,
} from "@/types/candidate";

export const ONBOARDING_STEPS: OnboardingStepMeta<OnboardingStepId>[] = [
  { id: "welcome", title: "Welcome", description: "How CareerOS works" },
  { id: "basic", title: "Basic information", description: "Who you are" },
  {
    id: "photo",
    title: "Profile photo",
    description: "Put a face to your profile",
    skippable: true,
  },
  { id: "education", title: "Education", description: "Your academic record", skippable: true },
  { id: "skills", title: "Skills", description: "What you're strong at" },
  { id: "experience", title: "Experience", description: "Where you've worked", skippable: true },
  { id: "projects", title: "Projects", description: "What you've built", skippable: true },
  {
    id: "certifications",
    title: "Certifications",
    description: "Credentials you've earned",
    skippable: true,
  },
  { id: "resume", title: "Resume", description: "Upload your latest resume", skippable: true },
  { id: "preferences", title: "Career preferences", description: "What you're looking for" },
  { id: "analysis", title: "AI analysis", description: "We read your profile", terminal: true },
  { id: "complete", title: "All set", description: "Enter your workspace", terminal: true },
];

export const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "SQL",
  "AWS",
  "Product design",
  "Data analysis",
  "Communication",
];

export const WORK_MODES = [
  { value: "remote", title: "Remote", description: "Work from anywhere" },
  { value: "hybrid", title: "Hybrid", description: "Split between office and home" },
  { value: "onsite", title: "On-site", description: "Primarily at the office" },
];

export const NOTICE_PERIODS = ["Immediate", "15 days", "30 days", "60 days", "90 days"];

export const APPLICATION_STATUS_FLOW: ApplicationStatus[] = [
  "applied",
  "under-review",
  "shortlisted",
  "interview",
  "offer",
];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  "under-review": "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const defaultJobFilters: JobFilters = {
  query: "",
  location: "any",
  remoteOnly: false,
  minSalary: 0,
  experience: "any",
  skills: [],
  sort: "relevance",
};

/**
 * Service layer: candidate business rules live here, never in components.
 * UI -> Hooks -> Services -> Repository -> Data source.
 */
export function createCandidateService(
  repository: CandidateRepository = hybridCandidateRepository,
) {
  const service = {
    /* Profile */
    getProfile: () => repository.getProfile(),
    updateProfile: (patch: Partial<CandidateProfile>) => repository.updateProfile(patch),

    /* Dashboard */
    getDashboard: () => repository.getDashboard(),

    /* Resume */
    getResumes: () => repository.getResumes(),
    uploadResume: (file: { name: string; sizeKb: number }) => repository.uploadResume(file),
    deleteResume: (id: string) => repository.deleteResume(id),
    setActiveResume: (id: string) => repository.setActiveResume(id),

    /* AI analysis */
    getAnalyses: () => repository.getAnalyses(),
    analyzeResume: (resumeId: string) => repository.analyzeResume(resumeId),

    /* Skill gap */
    getSkillGap: (targetRole?: string) => repository.getSkillGap(targetRole),

    /* Jobs */
    getJobs: (filters?: Partial<JobFilters>) => repository.getJobs(filters),
    getJob: (id: string) => repository.getJob(id),
    toggleSavedJob: (id: string) => repository.toggleSavedJob(id),

    /* Applications */
    getApplications: () => repository.getApplications(),
    applyToJob: (jobId: string, options?: ApplyOptions) => repository.applyToJob(jobId, options),
    withdrawApplication: (applicationId: string) => repository.withdrawApplication(applicationId),

    /* Interviews & prep */
    getInterviews: () => repository.getInterviews(),
    getPrepOverview: () => repository.getPrepOverview(),
    togglePracticed: (questionId: string) => repository.togglePracticed(questionId),

    /* Analytics */
    getAnalytics: () => repository.getAnalytics(),

    /* Settings */
    getSettings: () => repository.getSettings(),
    updateSettings: (patch: Partial<CandidateSettings>) => repository.updateSettings(patch),

    /* Onboarding */
    getOnboardingState: () => repository.getOnboardingState(),
    saveOnboardingState: (state: OnboardingState) => repository.saveOnboardingState(state),
    resetOnboarding: () => repository.resetOnboarding(),

    /* ------------------------------ Pure rules ----------------------------- */

    stepIndex(step: OnboardingStepId) {
      return Math.max(
        0,
        ONBOARDING_STEPS.findIndex((item) => item.id === step),
      );
    },

    stepProgress(step: OnboardingStepId) {
      return Math.round((service.stepIndex(step) / (ONBOARDING_STEPS.length - 1)) * 100);
    },

    nextStep(step: OnboardingStepId): OnboardingStepId {
      const index = service.stepIndex(step);
      return ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)].id;
    },

    previousStep(step: OnboardingStepId): OnboardingStepId {
      const index = service.stepIndex(step);
      return ONBOARDING_STEPS[Math.max(index - 1, 0)].id;
    },

    emptyOnboardingState: () => JSON.parse(JSON.stringify(emptyOnboardingState)) as OnboardingState,

    /** Per-step validation rules for the onboarding engine. */
    validateOnboardingStep(step: OnboardingStepId, data: OnboardingData): string | null {
      if (step === "basic") {
        const basic = data.basic;
        if (!basic?.fullName || basic.fullName.trim().length < 2) return "Enter your full name.";
        if (!basic.headline || basic.headline.trim().length < 4) {
          return "Add a headline of at least 4 characters.";
        }
        if (basic.phone && !/^[+\d][\d\s-]{6,19}$/.test(basic.phone.trim())) {
          return "Enter a valid phone number, or leave it empty.";
        }
        if (basic.bio && basic.bio.trim().length > 0 && basic.bio.trim().length < 30) {
          return "Your bio should be at least 30 characters, or leave it empty.";
        }
      }
      if (step === "skills" && (data.skills?.length ?? 0) < 3) {
        return "Select or add at least 3 skills.";
      }
      if (step === "preferences") {
        if (!data.preferences?.desiredRoles?.length) return "Add at least one target role.";
        if ((data.preferences?.minSalary ?? 0) < 0) return "Salary can't be negative.";
      }
      return null;
    },

    /** Reusable profile completion engine input for candidates. */
    onboardingCompletion(data: OnboardingData) {
      return buildCompletionReport([
        {
          id: "basic",
          label: "Basic information",
          hint: "Name, headline and location",
          weight: 3,
          done: Boolean(data.basic?.fullName && data.basic?.headline),
        },
        {
          id: "skills",
          label: "Skills",
          hint: "At least 3 skills sharpen your matches",
          weight: 3,
          done: (data.skills?.length ?? 0) >= 3,
        },
        {
          id: "education",
          label: "Education",
          hint: "Add your highest qualification",
          weight: 2,
          done: (data.education?.length ?? 0) > 0,
        },
        {
          id: "experience",
          label: "Experience",
          hint: "Add at least one role",
          weight: 3,
          done: (data.experience?.length ?? 0) > 0,
        },
        {
          id: "projects",
          label: "Projects",
          hint: "Show what you've built",
          weight: 1,
          done: (data.projects?.length ?? 0) > 0,
        },
        {
          id: "resume",
          label: "Resume",
          hint: "Upload a PDF or DOCX for AI analysis",
          weight: 3,
          done: Boolean(data.resumeFileName),
        },
        {
          id: "preferences",
          label: "Career preferences",
          hint: "Target roles, locations and salary",
          weight: 2,
          done: (data.preferences?.desiredRoles?.length ?? 0) > 0,
        },
      ]);
    },

    isOnboardingComplete(state: OnboardingState) {
      return state.completedSteps.includes("analysis") || state.currentStep === "complete";
    },

    computeCompletion(profile: CandidateProfile): ProfileCompletion {
      const sections = [
        { label: "Basic information", done: Boolean(profile.fullName && profile.headline) },
        { label: "Bio", done: profile.bio.length > 40 },
        { label: "Skills", done: profile.skills.length >= 3 },
        { label: "Education", done: profile.education.length > 0 },
        { label: "Experience", done: profile.experience.length > 0 },
        { label: "Projects", done: profile.projects.length > 0 },
        { label: "Certifications", done: profile.certifications.length > 0 },
        { label: "Career preferences", done: profile.preferences.desiredRoles.length > 0 },
      ];
      const done = sections.filter((section) => section.done).length;
      return { percentage: Math.round((done / sections.length) * 100), sections };
    },

    /** Same data as computeCompletion, shaped for the shared completion card. */
    profileCompletionReport(profile: CandidateProfile): CompletionReport {
      return buildCompletionReport([
        {
          id: "basic",
          label: "Basic information",
          hint: "Name and headline",
          weight: 2,
          done: Boolean(profile.fullName && profile.headline),
        },
        { id: "bio", label: "Bio", hint: "A short intro", done: profile.bio.length > 40 },
        {
          id: "skills",
          label: "Skills",
          hint: "At least three skills",
          weight: 2,
          done: profile.skills.length >= 3,
        },
        {
          id: "education",
          label: "Education",
          hint: "Your academic record",
          done: profile.education.length > 0,
        },
        {
          id: "experience",
          label: "Experience",
          hint: "Roles you've held",
          done: profile.experience.length > 0,
        },
        {
          id: "projects",
          label: "Projects",
          hint: "Work you've shipped",
          done: profile.projects.length > 0,
        },
        {
          id: "certifications",
          label: "Certifications",
          hint: "Credentials you've earned",
          done: profile.certifications.length > 0,
        },
        {
          id: "preferences",
          label: "Career preferences",
          hint: "Target roles and locations",
          weight: 2,
          done: profile.preferences.desiredRoles.length > 0,
        },
      ]);
    },

    validateResumeFile(file: { name: string; sizeBytes: number }): string | null {
      const allowed = [".pdf", ".doc", ".docx"];
      const lower = file.name.toLowerCase();
      if (!allowed.some((extension) => lower.endsWith(extension))) {
        return "Upload a PDF, DOC or DOCX file.";
      }
      if (file.sizeBytes > 5 * 1024 * 1024) return "Resume must be smaller than 5 MB.";
      if (file.sizeBytes === 0) return "That file appears to be empty.";
      return null;
    },

    statusProgress(status: ApplicationStatus): number {
      if (status === "rejected") return 100;
      const index = APPLICATION_STATUS_FLOW.indexOf(status);
      return Math.round(((index + 1) / APPLICATION_STATUS_FLOW.length) * 100);
    },

    matchTone(score: number): "high" | "medium" | "low" {
      if (score >= 85) return "high";
      if (score >= 70) return "medium";
      return "low";
    },

    formatSalary(job: Pick<Job, "salaryMin" | "salaryMax" | "currency">): string {
      const format = (value: number) =>
        value >= 100000 ? `${(value / 100000).toFixed(1).replace(/\.0$/, "")}L` : `${value}`;
      const symbol = job.currency === "INR" ? "₹" : "$";
      return `${symbol}${format(job.salaryMin)} – ${symbol}${format(job.salaryMax)}`;
    },

    splitInterviews(interviews: { scheduledAt: string; status: string }[]) {
      const now = Date.now();
      return {
        upcoming: interviews.filter(
          (item) => item.status === "scheduled" && Date.parse(item.scheduledAt) >= now - 3600_000,
        ),
        past: interviews.filter(
          (item) => item.status !== "scheduled" || Date.parse(item.scheduledAt) < now - 3600_000,
        ),
      };
    },

    applicationFunnel(applications: Application[]) {
      return APPLICATION_STATUS_FLOW.map((status) => ({
        status,
        label: APPLICATION_STATUS_LABEL[status],
        count: applications.filter((application) =>
          application.timeline.some((event) => event.status === status),
        ).length,
      }));
    },
  };

  return service;
}

export const candidateService = createCandidateService();
export type CandidateService = ReturnType<typeof createCandidateService>;
