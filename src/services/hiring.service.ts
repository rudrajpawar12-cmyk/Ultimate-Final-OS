import {
  type HiringRepository,
} from "@/repositories/hiring.repository";
import { hybridHiringRepository } from "@/repositories/hybrid-hiring.repository";

import type {
  Applicant,
  Interview,
  Job,
  JobDraft,
  JobStatus,
  PipelineStage,
  RecruiterAnalytics,
  SeriesPoint,
} from "@/types/hiring";

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const INTERVIEW_STAGE_LABEL = {
  screening: "Screening",
  technical: "Technical",
  culture: "Culture fit",
  final: "Final round",
} as const;

export const JOB_WIZARD_STEPS = [
  { id: "basics", title: "Basic information", description: "Title, team, location and type" },
  { id: "description", title: "Job description", description: "Overview and responsibilities" },
  { id: "skills", title: "Skills", description: "Must-have capabilities" },
  { id: "experience", title: "Experience", description: "Seniority window" },
  { id: "salary", title: "Salary", description: "Compensation range" },
  { id: "benefits", title: "Benefits", description: "What you offer" },
  { id: "team", title: "Hiring team", description: "Who runs this loop" },
  { id: "screening", title: "Screening questions", description: "Filter early" },
  { id: "review", title: "Review", description: "Publish or save as draft" },
] as const;

export type JobWizardStepId = (typeof JOB_WIZARD_STEPS)[number]["id"];

export interface JobFilters {
  query?: string;
  status?: JobStatus | "all";
  department?: string | "all";
  workMode?: string | "all";
  sort?: "recent" | "applicants" | "title";
}

export interface ApplicantFilters {
  query?: string;
  jobId?: string | "all";
  stage?: PipelineStage | "all";
  minExperience?: number;
  education?: string | "all";
  minResumeScore?: number;
  minMatchScore?: number;
  appliedWithinDays?: number | "all";
  skills?: string[];
  sort?: "recent" | "match" | "resume" | "name";
}

function withinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
}

/**
 * Service layer: every recruiter hiring business rule lives here.
 * UI -> Hooks -> Services -> Repository -> Data source.
 */
export function createHiringService(repository: HiringRepository = hybridHiringRepository) {
  return {
    // ---- reads -------------------------------------------------------
    listJobs: () => repository.listJobs(),
    getJob: (id: string) => repository.getJob(id),
    listApplicants: () => repository.listApplicants(),
    getApplicant: (id: string) => repository.getApplicant(id),
    listInterviews: () => repository.listInterviews(),
    getOverview: () => repository.getOverview(),
    getAnalytics: () => repository.getAnalytics(),
    getSettings: () => repository.getSettings(),

    // ---- writes ------------------------------------------------------
    createJob: (draft: JobDraft) => repository.createJob(draft),
    updateJob: (id: string, patch: Partial<JobDraft>) => repository.updateJob(id, patch),
    duplicateJob: (id: string) => repository.duplicateJob(id),
    setJobStatus: (id: string, status: JobStatus) => repository.setJobStatus(id, status),
    deleteJob: (id: string) => repository.deleteJob(id),
    setApplicantStage: (id: string, stage: PipelineStage) =>
      repository.setApplicantStage(id, stage),
    bulkSetApplicantStage: (ids: string[], stage: PipelineStage) =>
      repository.bulkSetApplicantStage(ids, stage),
    addApplicantNote: (id: string, body: string) => repository.addApplicantNote(id, body),
    addApplicantTag: (id: string, tag: string) => repository.addApplicantTag(id, tag),
    removeApplicantTag: (id: string, tag: string) => repository.removeApplicantTag(id, tag),
    saveInterview: (interview: Interview) => repository.saveInterview(interview),
    saveSettings: repository.saveSettings,
    runAiRanking: (jobId: string) => repository.runAiRanking(jobId),
    generateScreeningQuestions: (jobId: string, brief: string) =>
      repository.generateScreeningQuestions(jobId, brief),

    // ---- derivations --------------------------------------------------
    filterJobs(jobs: Job[], filters: JobFilters): Job[] {
      const query = filters.query?.trim().toLowerCase() ?? "";
      const result = jobs.filter((job) => {
        if (filters.status && filters.status !== "all" && job.status !== filters.status)
          return false;
        if (
          filters.department &&
          filters.department !== "all" &&
          job.department !== filters.department
        )
          return false;
        if (filters.workMode && filters.workMode !== "all" && job.workMode !== filters.workMode)
          return false;
        if (!query) return true;
        return [job.title, job.department, job.location, ...job.skills]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });

      const sort = filters.sort ?? "recent";
      return [...result].sort((a, b) => {
        if (sort === "applicants") return b.applicantCount - a.applicantCount;
        if (sort === "title") return a.title.localeCompare(b.title);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    },

    jobStatusCounts(jobs: Job[]) {
      return jobs.reduce<Record<string, number>>(
        (acc, job) => {
          acc.all += 1;
          acc[job.status] = (acc[job.status] ?? 0) + 1;
          return acc;
        },
        { all: 0, draft: 0, active: 0, paused: 0, closed: 0, archived: 0 },
      );
    },

    departments(jobs: Job[]) {
      return Array.from(new Set(jobs.map((job) => job.department))).sort();
    },

    filterApplicants(applicants: Applicant[], filters: ApplicantFilters): Applicant[] {
      const query = filters.query?.trim().toLowerCase() ?? "";
      const result = applicants.filter((applicant) => {
        if (filters.jobId && filters.jobId !== "all" && applicant.jobId !== filters.jobId)
          return false;
        if (filters.stage && filters.stage !== "all" && applicant.stage !== filters.stage)
          return false;
        if (filters.minExperience && applicant.experienceYears < filters.minExperience)
          return false;
        if (
          filters.education &&
          filters.education !== "all" &&
          !applicant.educationLevel.toLowerCase().startsWith(filters.education.toLowerCase())
        )
          return false;
        if (filters.minResumeScore && applicant.ai.resumeScore < filters.minResumeScore)
          return false;
        if (filters.minMatchScore && applicant.ai.matchScore < filters.minMatchScore) return false;
        if (
          filters.appliedWithinDays &&
          filters.appliedWithinDays !== "all" &&
          !withinDays(applicant.appliedAt, filters.appliedWithinDays)
        )
          return false;
        if (filters.skills?.length) {
          const owned = applicant.skills.map((skill) => skill.toLowerCase());
          const hasAll = filters.skills.every((skill) => owned.includes(skill.toLowerCase()));
          if (!hasAll) return false;
        }
        if (!query) return true;
        return [applicant.name, applicant.headline, applicant.jobTitle, ...applicant.skills]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });

      const sort = filters.sort ?? "recent";
      return [...result].sort((a, b) => {
        if (sort === "match") return b.ai.matchScore - a.ai.matchScore;
        if (sort === "resume") return b.ai.resumeScore - a.ai.resumeScore;
        if (sort === "name") return a.name.localeCompare(b.name);
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      });
    },

    allSkills(applicants: Applicant[]) {
      return Array.from(new Set(applicants.flatMap((applicant) => applicant.skills))).sort();
    },

    groupByStage(applicants: Applicant[]) {
      return PIPELINE_STAGES.map((stage) => ({
        stage,
        label: PIPELINE_STAGE_LABEL[stage],
        applicants: applicants.filter((applicant) => applicant.stage === stage),
      }));
    },

    upcomingInterviews(interviews: Interview[]) {
      return interviews
        .filter((item) => item.state === "scheduled")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    },

    interviewsOn(interviews: Interview[], day: Date) {
      const key = day.toDateString();
      return interviews.filter((item) => new Date(item.scheduledAt).toDateString() === key);
    },

    scoreTone(score: number): "high" | "medium" | "low" {
      if (score >= 85) return "high";
      if (score >= 65) return "medium";
      return "low";
    },

    formatSalary(job: Pick<Job, "salaryMin" | "salaryMax" | "salaryCurrency">) {
      const format = (value: number) =>
        new Intl.NumberFormat("en", {
          style: "currency",
          currency: job.salaryCurrency,
          maximumFractionDigits: 0,
          notation: value >= 100000 ? "compact" : "standard",
        }).format(value);
      return `${format(job.salaryMin)} – ${format(job.salaryMax)}`;
    },

    formatDate(iso: string) {
      return new Date(iso).toLocaleDateString("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },

    formatTime(iso: string) {
      return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
    },

    formatDateTime(iso: string) {
      return `${this.formatDate(iso)} · ${this.formatTime(iso)}`;
    },

    analyticsSummary(analytics: RecruiterAnalytics) {
      const totalApplications = analytics.applicationsOverTime.reduce(
        (sum, point) => sum + point.applications,
        0,
      );
      const avgTimeToHire = analytics.timeToHire.length
        ? Math.round(
            analytics.timeToHire.reduce((sum, point) => sum + point.value, 0) /
              analytics.timeToHire.length,
          )
        : 0;
      const accepted = analytics.offerAcceptance.reduce((sum, point) => sum + point.accepted, 0);
      const declined = analytics.offerAcceptance.reduce((sum, point) => sum + point.declined, 0);
      const offerAcceptanceRate =
        accepted + declined > 0 ? Math.round((accepted / (accepted + declined)) * 100) : 0;
      return {
        totalApplications,
        avgTimeToHire,
        offerAcceptanceRate,
        activeJobs: analytics.jobPerformance.length,
      };
    },

    /** Turns absolute series values into 0-100 percentages of the largest value. */
    toPercentages(points: SeriesPoint[]) {
      const max = points.reduce((peak, point) => Math.max(peak, point.value), 0);
      return points.map((point) => ({
        ...point,
        percentage: max > 0 ? Math.round((point.value / max) * 100) : 0,
      }));
    },

    relativeTime(iso: string) {
      const diff = Date.now() - new Date(iso).getTime();
      const minutes = Math.round(diff / 60000);
      if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.round(hours / 24);
      if (days < 30) return `${days}d ago`;
      return `${Math.round(days / 30)}mo ago`;
    },

    hiringProgress(job: Job) {
      if (!job.applicantCount) return 0;
      const weighted =
        job.interviewCount * 2 + job.offerCount * 4 + job.hiredCount * 6 + job.applicantCount;
      return Math.min(100, Math.round((weighted / (job.applicantCount * 3)) * 100));
    },

    emptyJobDraft(): JobDraft {
      return {
        title: "",
        department: "",
        location: "",
        workMode: "hybrid",
        employmentType: "Full-time",
        status: "draft",
        experienceMin: 2,
        experienceMax: 5,
        salaryMin: 1200000,
        salaryMax: 2400000,
        salaryCurrency: "INR",
        skills: [],
        benefits: [],
        description: "",
        responsibilities: [],
        requirements: [],
        hiringTeam: [],
        screeningQuestions: [],
      };
    },

    validateWizardStep(step: JobWizardStepId, draft: JobDraft): string | null {
      if (step === "basics") {
        if (draft.title.trim().length < 3) return "Enter a job title with at least 3 characters.";
        if (draft.department.trim().length < 2) return "Enter the hiring department.";
        if (draft.location.trim().length < 2) return "Enter a location.";
      }
      if (step === "description") {
        if (draft.description.trim().length < 40)
          return "Add at least 40 characters of job overview.";
        if (!draft.responsibilities.length) return "Add at least one responsibility.";
      }
      if (step === "skills" && draft.skills.length < 1) return "Add at least one required skill.";
      if (step === "experience" && draft.experienceMin > draft.experienceMax)
        return "Minimum experience cannot exceed the maximum.";
      if (step === "salary" && draft.salaryMin > draft.salaryMax)
        return "Minimum salary cannot exceed the maximum.";
      return null;
    },
  };
}

export const hiringService = createHiringService();
export type HiringService = ReturnType<typeof createHiringService>;