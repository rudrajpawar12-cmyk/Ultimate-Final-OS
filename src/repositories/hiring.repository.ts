import {
  activityFixtures,
  analyticsFixtures,
  applicantFixtures,
  interviewFixtures,
  jobFixtures,
  settingsFixtures,
} from "@/repositories/fixtures/hiring.fixtures";
import type {
  Applicant,
  ApplicantNote,
  AiWorkspaceResult,
  HiringOverview,
  Interview,
  Job,
  JobDraft,
  JobStatus,
  PipelineStage,
  RecruiterAnalytics,
  RecruiterSettings,
} from "@/types/hiring";

/**
 * Data source boundary for the recruiter hiring domain.
 * Swapping this for an API/Supabase implementation must not touch
 * services, hooks or UI.
 */
export interface HiringRepository {
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  createJob(draft: JobDraft): Promise<Job>;
  updateJob(id: string, patch: Partial<JobDraft>): Promise<Job>;
  duplicateJob(id: string): Promise<Job>;
  setJobStatus(id: string, status: JobStatus): Promise<Job>;
  deleteJob(id: string): Promise<{ id: string }>;

  listApplicants(): Promise<Applicant[]>;
  getApplicant(id: string): Promise<Applicant | null>;
  setApplicantStage(id: string, stage: PipelineStage): Promise<Applicant>;
  bulkSetApplicantStage(ids: string[], stage: PipelineStage): Promise<Applicant[]>;
  addApplicantNote(id: string, body: string): Promise<Applicant>;
  addApplicantTag(id: string, tag: string): Promise<Applicant>;
  removeApplicantTag(id: string, tag: string): Promise<Applicant>;

  listInterviews(): Promise<Interview[]>;
  saveInterview(interview: Interview): Promise<Interview>;

  getOverview(): Promise<HiringOverview>;
  getAnalytics(): Promise<RecruiterAnalytics>;
  runAiRanking(jobId: string): Promise<AiWorkspaceResult>;
  generateScreeningQuestions(jobId: string, brief: string): Promise<string[]>;

  getSettings(): Promise<RecruiterSettings>;
  saveSettings(settings: RecruiterSettings): Promise<RecruiterSettings>;
}

function delay(ms = 320) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** In-memory demo store. Mutations persist for the session only. */
const db = {
  jobs: clone(jobFixtures),
  applicants: clone(applicantFixtures),
  interviews: clone(interviewFixtures),
  settings: clone(settingsFixtures),
};

function requireJob(id: string): Job {
  const job = db.jobs.find((item) => item.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
}

function requireApplicant(id: string): Applicant {
  const applicant = db.applicants.find((item) => item.id === id);
  if (!applicant) throw new Error(`Applicant ${id} not found`);
  return applicant;
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const localHiringRepository: HiringRepository = {
  async listJobs() {
    await delay();
    return clone(db.jobs);
  },

  async getJob(id) {
    await delay(260);
    const job = db.jobs.find((item) => item.id === id);
    return job ? clone(job) : null;
  },

  async createJob(draft) {
    await delay(420);
    const now = new Date().toISOString();
    const job: Job = {
      ...draft,
      id: nextId("job"),
      createdAt: now,
      updatedAt: now,
      applicantCount: 0,
      interviewCount: 0,
      offerCount: 0,
      hiredCount: 0,
      views: 0,
      timeline: [
        {
          id: nextId("tl"),
          label: draft.status === "active" ? "Job published" : "Draft created",
          description: "Created from the job creation wizard",
          date: now,
          type: draft.status === "active" ? "published" : "created",
        },
      ],
    };
    db.jobs = [job, ...db.jobs];
    return clone(job);
  },

  async updateJob(id, patch) {
    await delay(360);
    const job = requireJob(id);
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    return clone(job);
  },

  async duplicateJob(id) {
    await delay(360);
    const job = requireJob(id);
    const now = new Date().toISOString();
    const copy: Job = {
      ...clone(job),
      id: nextId("job"),
      title: `${job.title} (copy)`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      applicantCount: 0,
      interviewCount: 0,
      offerCount: 0,
      hiredCount: 0,
      views: 0,
      timeline: [
        {
          id: nextId("tl"),
          label: "Duplicated",
          description: `Copied from ${job.title}`,
          date: now,
          type: "created",
        },
      ],
    };
    db.jobs = [copy, ...db.jobs];
    return clone(copy);
  },

  async setJobStatus(id, status) {
    await delay(280);
    const job = requireJob(id);
    job.status = status;
    job.updatedAt = new Date().toISOString();
    job.timeline = [
      {
        id: nextId("tl"),
        label: `Status changed to ${status}`,
        description: "Updated from the recruiter workspace",
        date: job.updatedAt,
        type: status === "active" ? "published" : "note",
      },
      ...job.timeline,
    ];
    return clone(job);
  },

  async deleteJob(id) {
    await delay(280);
    db.jobs = db.jobs.filter((item) => item.id !== id);
    db.applicants = db.applicants.filter((item) => item.jobId !== id);
    return { id };
  },

  async listApplicants() {
    await delay();
    return clone(db.applicants);
  },

  async getApplicant(id) {
    await delay(260);
    const applicant = db.applicants.find((item) => item.id === id);
    return applicant ? clone(applicant) : null;
  },

  async setApplicantStage(id, stage) {
    await delay(240);
    const applicant = requireApplicant(id);
    applicant.stageHistory = [
      {
        id: nextId("stage"),
        fromStage: applicant.stage,
        toStage: stage,
        actor: "You",
        createdAt: new Date().toISOString(),
      },
      ...(applicant.stageHistory ?? []),
    ];
    applicant.stage = stage;
    return clone(applicant);
  },

  async bulkSetApplicantStage(ids, stage) {
    const updated: Applicant[] = [];
    for (const id of ids) {
      updated.push(await this.setApplicantStage(id, stage));
    }
    return updated;
  },

  async addApplicantTag(id, tag) {
    await delay(160);
    const applicant = requireApplicant(id);
    const value = tag.trim();
    if (value && !(applicant.tags ?? []).includes(value)) {
      applicant.tags = [...(applicant.tags ?? []), value];
    }
    return clone(applicant);
  },

  async removeApplicantTag(id, tag) {
    await delay(160);
    const applicant = requireApplicant(id);
    applicant.tags = (applicant.tags ?? []).filter((item) => item !== tag);
    return clone(applicant);
  },



  async addApplicantNote(id, body) {
    await delay(240);
    const applicant = requireApplicant(id);
    const note: ApplicantNote = {
      id: nextId("note"),
      author: "You",
      body,
      createdAt: new Date().toISOString(),
    };
    applicant.notes = [note, ...applicant.notes];
    return clone(applicant);
  },

  async listInterviews() {
    await delay();
    return clone(db.interviews);
  },

  async saveInterview(interview) {
    await delay(320);
    const index = db.interviews.findIndex((item) => item.id === interview.id);
    if (index >= 0) {
      db.interviews[index] = clone(interview);
    } else {
      db.interviews = [clone(interview), ...db.interviews];
    }
    return clone(interview);
  },

  async getOverview() {
    await delay(380);
    const stages: PipelineStage[] = [
      "applied",
      "screening",
      "shortlisted",
      "interview",
      "offer",
      "hired",
      "rejected",
    ];
    const today = new Date().toDateString();
    const overview: HiringOverview = {
      openPositions: db.jobs.filter((job) => job.status === "active" || job.status === "paused")
        .length,
      activeJobs: db.jobs.filter((job) => job.status === "active").length,
      newApplicants: db.applicants.filter(
        (applicant) => Date.now() - new Date(applicant.appliedAt).getTime() < 7 * 86_400_000,
      ).length,
      interviewsToday: db.interviews.filter(
        (interview) =>
          interview.state === "scheduled" &&
          new Date(interview.scheduledAt).toDateString() === today,
      ).length,
      offersOut: db.applicants.filter((applicant) => applicant.stage === "offer").length,
      avgTimeToHire: 27,
      pipeline: stages.map((stage) => ({
        stage,
        count: db.applicants.filter((applicant) => applicant.stage === stage).length,
      })),
      aiInsights: [
        {
          id: "ai-1",
          title: "Frontend pipeline is offer-ready",
          body: "2 candidates score above 88% fit for Senior Frontend Engineer. Move them forward this week.",
          tone: "positive",
        },
        {
          id: "ai-2",
          title: "Data Analyst is stalling",
          body: "No stage movement in 9 days while the role is paused. Reopen or close to keep the funnel clean.",
          tone: "warning",
        },
        {
          id: "ai-3",
          title: "Referrals convert 2.4x better",
          body: "Referred candidates reach interview at 41% vs 17% from job boards.",
          tone: "info",
        },
      ],
      activity: clone(activityFixtures),
    };
    return overview;
  },

  async getAnalytics() {
    await delay(420);
    return clone(analyticsFixtures);
  },

  async runAiRanking(jobId) {
    await delay(1200);
    const applicants = db.applicants.filter((applicant) => applicant.jobId === jobId);
    if (!applicants.length) throw new Error("No applicants to rank for this job.");
    return {
      jobId,
      generatedAt: new Date().toISOString(),
      summary: `Ranked ${applicants.length} applicants against the role requirements.`,
      rankings: applicants
        .map((applicant) => ({
          applicantId: applicant.id,
          name: applicant.name,
          jobTitle: applicant.jobTitle,
          fitScore: applicant.ai.matchScore,
          matchedSkills: applicant.ai.matchedSkills,
          missingSkills: applicant.ai.missingSkills,
          recommendation: applicant.ai.recommendation,
        }))
        .sort((a, b) => b.fitScore - a.fitScore),
    } satisfies AiWorkspaceResult;
  },

  async generateScreeningQuestions(): Promise<string[]> {
    throw new Error("Screening question generation requires a connected workspace.");
  },

  async getSettings() {
    await delay(320);
    return clone(db.settings);
  },

  async saveSettings(settings) {
    await delay(360);
    db.settings = clone(settings);
    return clone(db.settings);
  },
};