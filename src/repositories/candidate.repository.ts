import {
  analysesFixture,
  analyticsFixture,
  applicationsFixture,
  insightsFixture,
  interviewsFixture,
  jobsFixture,
  notificationsFixture,
  prepFixture,
  profileFixture,
  resumesFixture,
  settingsFixture,
  skillGapFixture,
} from "@/repositories/fixtures/candidate.fixtures";
import type {
  AnalysisOutcome,
  Application,
  CandidateAnalytics,
  CandidateDashboardData,
  CandidateProfile,
  CandidateSettings,
  Interview,
  Job,
  JobFilters,
  OnboardingState,
  PrepOverview,
  ResumeAnalysis,
  ResumeFile,
  SkillGap,
} from "@/types/candidate";

/** Options accepted by the apply flow (resume selection, cover letter). */
export interface ApplyOptions {
  resumeId?: string;
  coverLetter?: string;
}

/**
 * Data source boundary for every candidate feature.
 * Swapping this for a Supabase implementation must not touch services or UI.
 */
export interface CandidateRepository {

  getProfile(): Promise<CandidateProfile>;
  updateProfile(patch: Partial<CandidateProfile>): Promise<CandidateProfile>;

  getDashboard(): Promise<CandidateDashboardData>;


  getResumes(): Promise<ResumeFile[]>;
  uploadResume(file: { name: string; sizeKb: number }): Promise<ResumeFile>;
  deleteResume(id: string): Promise<void>;
  setActiveResume(id: string): Promise<ResumeFile[]>;

  getAnalyses(): Promise<ResumeAnalysis[]>;
  analyzeResume(resumeId: string): Promise<AnalysisOutcome>;

  getSkillGap(targetRole?: string): Promise<SkillGap>;

  getJobs(filters?: Partial<JobFilters>): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  toggleSavedJob(id: string): Promise<Job>;

  getApplications(): Promise<Application[]>;
  applyToJob(jobId: string, options?: ApplyOptions): Promise<Application>;
  withdrawApplication(applicationId: string): Promise<Application>;


  getInterviews(): Promise<Interview[]>;
  getPrepOverview(): Promise<PrepOverview>;
  togglePracticed(questionId: string): Promise<PrepOverview>;

  getAnalytics(): Promise<CandidateAnalytics>;

  getSettings(): Promise<CandidateSettings>;
  updateSettings(patch: Partial<CandidateSettings>): Promise<CandidateSettings>;

  getOnboardingState(): Promise<OnboardingState>;
  saveOnboardingState(state: OnboardingState): Promise<OnboardingState>;
  resetOnboarding(): Promise<OnboardingState>;
}

const ONBOARDING_KEY = "careeros.candidate.onboarding";

function delay(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/* In-memory mutable state seeded from the fixtures. */
let profile = clone(profileFixture);
let resumes = clone(resumesFixture);
let analyses = clone(analysesFixture);
let jobs = clone(jobsFixture);
let applications = clone(applicationsFixture);
let prep = clone(prepFixture);
let settings = clone(settingsFixture);

export const emptyOnboardingState: OnboardingState = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

function readOnboarding(): OnboardingState {
  if (typeof window === "undefined") return clone(emptyOnboardingState);
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingState) : clone(emptyOnboardingState);
  } catch {
    return clone(emptyOnboardingState);
  }
}

function writeOnboarding(state: OnboardingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

function matchesFilters(job: Job, filters: Partial<JobFilters>): boolean {
  const query = filters.query?.trim().toLowerCase();
  if (query) {
    const haystack = `${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.location && filters.location !== "any") {
    if (!job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
  }
  if (filters.remoteOnly && !job.remote) return false;
  if (filters.minSalary && job.salaryMax < filters.minSalary) return false;
  if (filters.experience && filters.experience !== "any" && job.experience !== filters.experience) {
    return false;
  }
  if (filters.skills?.length) {
    const owned = job.skills.map((s) => s.toLowerCase());
    if (!filters.skills.every((skill) => owned.includes(skill.toLowerCase()))) return false;
  }
  return true;
}

function sortJobs(list: Job[], sort: JobFilters["sort"] = "relevance"): Job[] {
  const copy = [...list];
  if (sort === "recent") {
    return copy.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  }
  if (sort === "salary") {
    return copy.sort((a, b) => b.salaryMax - a.salaryMax);
  }
  return copy.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Local repository implementation backed by temporary fixtures.
 */
export const localCandidateRepository: CandidateRepository = {
  async getProfile() {
    await delay();
    return clone(profile);
  },

  async updateProfile(patch) {
    await delay();
    profile = { ...profile, ...clone(patch) };
    return clone(profile);
  },

  async getDashboard() {
    await delay(520);
    const latest = analyses[0];
    return clone({
      profile,
      resumeScore: {
        score: latest?.overallScore ?? 0,
        ats: latest?.atsScore ?? 0,
        updatedAt: latest?.createdAt ?? new Date().toISOString(),
      },
      insights: insightsFixture,
      recommendedJobs: sortJobs(jobs).slice(0, 4),
      savedJobs: jobs.filter((job) => job.saved),
      applications,
      interviews: interviewsFixture.filter((i) => i.status === "scheduled"),
      notifications: notificationsFixture,
    });
  },

  async getResumes() {
    await delay();
    return clone(resumes);
  },

  async uploadResume(file) {
    await delay(900);
    const next: ResumeFile = {
      id: `r${Date.now()}`,
      fileName: file.name,
      sizeKb: file.sizeKb,
      uploadedAt: new Date().toISOString(),
      status: "active",
      version: resumes.length + 1,
    };
    resumes = [next, ...resumes.map((r) => ({ ...r, status: "archived" as const }))];
    return clone(next);
  },

  async deleteResume(id) {
    await delay();
    resumes = resumes.filter((resume) => resume.id !== id);
    if (resumes.length && !resumes.some((r) => r.status === "active")) {
      resumes[0] = { ...resumes[0], status: "active" };
    }
  },

  async setActiveResume(id) {
    await delay();
    resumes = resumes.map((resume) => ({
      ...resume,
      status: resume.id === id ? "active" : "archived",
    }));
    return clone(resumes);
  },

  async getAnalyses() {
    await delay();
    return clone(analyses);
  },

  async analyzeResume(resumeId) {
    await delay(1500);
    const resume = resumes.find((item) => item.id === resumeId);
    if (!resume) {
      return {
        kind: "insufficient-data",
        message: "Upload a resume before running an analysis.",
      };
    }
    if (resume.sizeKb < 20) {
      return {
        kind: "insufficient-data",
        message: "This resume has too little text for a reliable analysis.",
      };
    }
    const template = analyses[0] ?? analysesFixture[0];
    const analysis: ResumeAnalysis = {
      ...clone(template),
      id: `an_${Date.now()}`,
      resumeId,
      createdAt: new Date().toISOString(),
    };
    analyses = [analysis, ...analyses];
    return { kind: "ok", analysis: clone(analysis) };
  },

  async getSkillGap(targetRole) {
    await delay();
    return clone({ ...skillGapFixture, targetRole: targetRole ?? skillGapFixture.targetRole });
  },

  async getJobs(filters = {}) {
    await delay();
    return clone(
      sortJobs(
        jobs.filter((job) => matchesFilters(job, filters)),
        filters.sort,
      ),
    );
  },

  async getJob(id) {
    await delay();
    return clone(jobs.find((job) => job.id === id) ?? null);
  },

  async toggleSavedJob(id) {
    await delay(220);
    jobs = jobs.map((job) => (job.id === id ? { ...job, saved: !job.saved } : job));
    const job = jobs.find((item) => item.id === id);
    if (!job) throw new Error("Job not found");
    return clone(job);
  },

  async getApplications() {
    await delay();
    return clone(applications);
  },

  async applyToJob(jobId) {
    await delay(700);
    const job = jobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Job not found");
    const existing = applications.find((application) => application.jobId === jobId);
    if (existing) return clone(existing);
    const now = new Date().toISOString();
    const application: Application = {
      id: `a${Date.now()}`,
      jobId,
      jobTitle: job.title,
      company: job.company,
      appliedAt: now,
      status: "applied",
      nextAction: "Wait for recruiter screening",
      timeline: [{ id: `t${Date.now()}`, status: "applied", date: now }],
    };
    applications = [application, ...applications];
    return clone(application);
  },

  async withdrawApplication(applicationId) {
    await delay(400);
    const now = new Date().toISOString();
    applications = applications.map((application) =>
      application.id === applicationId
        ? {
            ...application,
            status: "withdrawn" as const,
            nextAction: "You withdrew this application",
            timeline: [
              ...application.timeline,
              { id: `t${Date.now()}`, status: "withdrawn" as const, date: now },
            ],
          }
        : application,
    );
    const updated = applications.find((application) => application.id === applicationId);
    if (!updated) throw new Error("Application not found");
    return clone(updated);
  },

  async getInterviews() {
    await delay();
    return clone(interviewsFixture);
  },

  async getPrepOverview() {
    await delay();
    return clone(prep);
  },

  async togglePracticed(questionId) {
    await delay(200);
    const questions = prep.questions.map((question) =>
      question.id === questionId ? { ...question, practiced: !question.practiced } : question,
    );
    const practiced = questions.filter((question) => question.practiced).length;
    prep = {
      ...prep,
      questions,
      progress: {
        practiced,
        total: questions.length,
        readiness: Math.round((practiced / questions.length) * 100),
      },
    };
    return clone(prep);
  },

  async getAnalytics() {
    await delay(480);
    return clone(analyticsFixture);
  },

  async getSettings() {
    await delay();
    return clone(settings);
  },

  async updateSettings(patch) {
    await delay(320);
    settings = { ...settings, ...clone(patch) };
    return clone(settings);
  },

  async getOnboardingState() {
    await delay(200);
    return readOnboarding();
  },

  async saveOnboardingState(state) {
    await delay(320);
    writeOnboarding(state);
    return clone(state);
  },

  async resetOnboarding() {
    await delay(160);
    const fresh = clone(emptyOnboardingState);
    writeOnboarding(fresh);
    return fresh;
  },
};
