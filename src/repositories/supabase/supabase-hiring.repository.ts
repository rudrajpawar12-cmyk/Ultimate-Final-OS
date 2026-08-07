import type { SupabaseClient } from "@supabase/supabase-js";

import { BaseRepository } from "@/repositories/base.repository";
import type { HiringRepository } from "@/repositories/hiring.repository";

import type {
  ActivityItem,
  AiWorkspaceResult,
  Applicant,
  ApplicantEducation,
  ApplicantExperience,
  ApplicantNote,
  ApplicantProject,
  HiringOverview,
  Interview,
  InterviewStage,
  InterviewState,
  Job,
  JobDraft,
  JobStatus,
  JobTimelineEvent,
  ApplicantStageEvent,
  PipelineStage,
  RecruiterAnalytics,
  RecruiterSettings,
  SeriesPoint,
} from "@/types/hiring";

import { AppError } from "@/lib/errors";
import {
  derivedStrengths,
  derivedWeaknesses,
  fitScore,
  highestEducationLevel,
  matchSkills,
  recommendationFor,
  totalExperienceYears,
} from "@/lib/applicant-scoring";

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                  */
/* -------------------------------------------------------------------------- */

interface ApplicationRow {
  id: string;
  job_id: string;
  user_id: string;
  recruiter_id: string;
  status: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  profile_photo_url: string | null;
}

interface ExperienceRow {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  currently_working: boolean;
  description: string | null;
}

interface EducationRow {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  live_url: string | null;
  github_url: string | null;
}

interface SkillRow {
  id: string;
  user_id: string;
  skill_name: string;
}

interface ResumeRow {
  id: string;
  user_id: string;
  file_name: string;
  original_file_name: string;
  is_active: boolean;
  created_at: string;
}

interface ResumeAnalysisRow {
  id: string;
  user_id: string;
  overall_score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  created_at: string;
}

interface NoteRow {
  id: string;
  application_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

interface InterviewRow {
  id: string;
  recruiter_id: string;
  application_id: string;
  job_id: string;
  stage: string;
  state: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: string;
  location: string | null;
  panel: { id: string; name: string; role: string }[] | null;
  notes: string | null;
  feedback: { rating: number; summary: string; author: string } | null;
}

interface EmailRow {
  user_id: string;
  email: string;
}

interface TagRow {
  id: string;
  application_id: string;
  tag: string;
}

interface StageEventRow {
  id: string;
  application_id: string;
  from_stage: string | null;
  to_stage: string;
  actor: string | null;
  created_at: string;
}

/** Live-derived job statistics (the `jobs` table stores no counters). */
interface JobCounters {
  applicantCount: number;
  interviewCount: number;
  offerCount: number;
  hiredCount: number;
  views: number;
  timeline: JobTimelineEvent[];
}

/* -------------------------------------------------------------------------- */
/* Constants & small helpers                                                   */
/* -------------------------------------------------------------------------- */

const STAGES: PipelineStage[] = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const FUNNEL_STAGES: PipelineStage[] = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
];

const STAGE_LABEL: Record<PipelineStage, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAY_MS = 86_400_000;

function toStage(value: string | null): PipelineStage {
  const stage = (value ?? "").toLowerCase() as PipelineStage;
  return STAGES.includes(stage) ? stage : "applied";
}

function stageIndex(stage: PipelineStage): number {
  return FUNNEL_STAGES.indexOf(stage);
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = map.get(key(row));
    if (bucket) bucket.push(row);
    else map.set(key(row), [row]);
  }
  return map;
}

function formatPeriod(start: string | null, end: string | null, ongoing = false): string {
  const from = start ?? "";
  const to = ongoing ? "Present" : (end ?? "Present");
  if (!from && !to) return "";
  return `${from} – ${to}`;
}

function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en", { month: "short" }),
    });
  }
  return months;
}

/* -------------------------------------------------------------------------- */
/* Repository                                                                  */
/* -------------------------------------------------------------------------- */

export class SupabaseHiringRepository extends BaseRepository implements HiringRepository {
  /**
   * Loosely typed table accessor. The generated `Database` type does not yet
   * cover the recruiter hiring tables, so rows are cast to the explicit
   * interfaces above right after each query.
   */
  private table(name: string) {
    return (this.client as unknown as SupabaseClient).from(name);
  }

  // ---------------- HELPERS ----------------

  private mapRow(row: Record<string, unknown>, counters?: JobCounters): Job {
    const value = <T>(key: string, fallback: T): T => (row[key] as T | null) ?? fallback;
    const text = (key: string) => value<string>(key, "");

    return {
      id: text("id"),
      title: text("title"),
      department: text("department"),
      location: text("location"),
      workMode: value<Job["workMode"]>("workplace_type", "remote"),
      employmentType: text("employment_type"),
      status: value<JobStatus>("status", "draft"),
      experienceMin: value<number>("min_experience", 0),
      experienceMax: value<number>("max_experience", 0),
      salaryMin: value<number>("min_salary", 0),
      salaryMax: value<number>("max_salary", 0),
      salaryCurrency: value<string>("currency", "INR"),
      skills: value<string[]>("skills", []),
      benefits: text("benefits") ? text("benefits").split("\n") : [],
      description: text("description"),
      responsibilities: text("responsibilities") ? text("responsibilities").split("\n") : [],
      requirements: text("requirements") ? text("requirements").split("\n") : [],
      hiringTeam: [],
      screeningQuestions: [],
      createdAt: text("created_at"),
      updatedAt: text("updated_at"),
      closingDate: (row["application_deadline"] as string | null) ?? undefined,
      applicantCount: counters?.applicantCount ?? 0,
      interviewCount: counters?.interviewCount ?? 0,
      offerCount: counters?.offerCount ?? 0,
      hiredCount: counters?.hiredCount ?? 0,
      views: counters?.views ?? 0,
      timeline: counters?.timeline ?? [],
    };
  }

  /**
   * Counters are derived live from `applications`, `interviews` and
   * `job_views` — the `jobs` table stores no denormalised totals.
   */
  private async loadJobCounters(
    recruiterId: string,
    jobIds: string[],
  ): Promise<Map<string, JobCounters>> {
    const counters = new Map<string, JobCounters>();
    if (!jobIds.length) return counters;

    for (const jobId of jobIds) {
      counters.set(jobId, {
        applicantCount: 0,
        interviewCount: 0,
        offerCount: 0,
        hiredCount: 0,
        views: 0,
        timeline: [],
      });
    }

    const [applicationsResult, interviewsResult, viewsResult] = await Promise.all([
      this.table("applications")
        .select("id, job_id, status, created_at")
        .eq("recruiter_id", recruiterId)
        .in("job_id", jobIds),
      this.table("interviews")
        .select("id, job_id, scheduled_at")
        .eq("recruiter_id", recruiterId)
        .in("job_id", jobIds),
      this.table("job_views").select("id, job_id, created_at").in("job_id", jobIds),
    ]);

    const applications = (applicationsResult.data ?? []) as {
      id: string;
      job_id: string;
      status: string | null;
      created_at: string;
    }[];

    for (const application of applications) {
      const entry = counters.get(application.job_id);
      if (!entry) continue;
      const stage = toStage(application.status);
      entry.applicantCount += 1;
      if (stage === "offer") entry.offerCount += 1;
      if (stage === "hired") entry.hiredCount += 1;
    }

    const interviews = (interviewsResult.data ?? []) as {
      id: string;
      job_id: string;
      scheduled_at: string;
    }[];

    for (const interview of interviews) {
      const entry = counters.get(interview.job_id);
      if (!entry) continue;
      entry.interviewCount += 1;
    }

    // `job_views` may not exist yet on older databases — treat as zero views.
    if (!viewsResult.error) {
      for (const view of (viewsResult.data ?? []) as { job_id: string }[]) {
        const entry = counters.get(view.job_id);
        if (entry) entry.views += 1;
      }
    }

    // Timeline: latest application and interview activity per job.
    const latestByJob = new Map<string, JobTimelineEvent[]>();
    for (const application of applications) {
      const bucket = latestByJob.get(application.job_id) ?? [];
      bucket.push({
        id: `timeline-application-${application.id}`,
        label: "New application",
        description: "A candidate applied to this role.",
        date: application.created_at,
        type: "applicant",
      });
      latestByJob.set(application.job_id, bucket);
    }
    for (const interview of interviews) {
      const bucket = latestByJob.get(interview.job_id) ?? [];
      bucket.push({
        id: `timeline-interview-${interview.id}`,
        label: "Interview scheduled",
        description: "An interview was scheduled for this role.",
        date: interview.scheduled_at,
        type: "interview",
      });
      latestByJob.set(interview.job_id, bucket);
    }
    for (const [jobId, events] of latestByJob) {
      const entry = counters.get(jobId);
      if (!entry) continue;
      entry.timeline = events
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);
    }

    return counters;
  }


  private async getRecruiterId(userId: string): Promise<string> {
    const { data, error } = await this.table("recruiters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new AppError("Recruiter profile not found", "NOT_FOUND", 404);
    }

    return (data as { id: string }).id;
  }

  private async getRecruiter(): Promise<{ id: string; fullName: string }> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.table("recruiters")
      .select("id, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new AppError("Recruiter profile not found", "NOT_FOUND", 404);
    }

    const row = data as { id: string; full_name: string | null };
    return { id: row.id, fullName: row.full_name ?? "Recruiter" };
  }

  private fail(message: string): never {
    throw new AppError(message, "SERVER_ERROR", 500);
  }

  // ---------------- JOBS ----------------

  async listJobs(): Promise<Job[]> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data, error } = await this.table("jobs")
      .select("*")
      .eq("recruiter_id", recruiterId)
      .order("created_at", { ascending: false });

    if (error) this.fail(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    const counters = await this.loadJobCounters(
      recruiterId,
      rows.map((row) => row["id"] as string),
    );

    return rows.map((row) => this.mapRow(row, counters.get(row["id"] as string)));
  }

  async getJob(id: string): Promise<Job | null> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data, error } = await this.table("jobs")
      .select("*")
      .eq("id", id)
      .eq("recruiter_id", recruiterId)
      .maybeSingle();

    if (error) this.fail(error.message);
    if (!data) return null;

    const counters = await this.loadJobCounters(recruiterId, [id]);
    return this.mapRow(data as Record<string, unknown>, counters.get(id));
  }


  async createJob(draft: JobDraft): Promise<Job> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const now = new Date().toISOString();
    const payload = {
      recruiter_id: recruiterId,
      title: draft.title,
      department: draft.department,
      employment_type: draft.employmentType,
      workplace_type: draft.workMode,
      location: draft.location,
      min_salary: draft.salaryMin,
      max_salary: draft.salaryMax,
      currency: draft.salaryCurrency,
      description: draft.description,
      responsibilities: draft.responsibilities.join("\n"),
      requirements: draft.requirements.join("\n"),
      benefits: draft.benefits.join("\n"),
      skills: draft.skills,
      status: draft.status,
      application_deadline: draft.closingDate ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.table("jobs").insert(payload).select("*").single();

    if (error) this.fail(error.message);

    return this.mapRow(data as Record<string, unknown>);
  }

  async updateJob(id: string, patch: Partial<JobDraft>): Promise<Job> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.department !== undefined) payload.department = patch.department;
    if (patch.employmentType !== undefined) payload.employment_type = patch.employmentType;
    if (patch.workMode !== undefined) payload.workplace_type = patch.workMode;
    if (patch.location !== undefined) payload.location = patch.location;
    if (patch.salaryMin !== undefined) payload.min_salary = patch.salaryMin;
    if (patch.salaryMax !== undefined) payload.max_salary = patch.salaryMax;
    if (patch.salaryCurrency !== undefined) payload.currency = patch.salaryCurrency;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.responsibilities !== undefined)
      payload.responsibilities = patch.responsibilities.join("\n");
    if (patch.requirements !== undefined) payload.requirements = patch.requirements.join("\n");
    if (patch.benefits !== undefined) payload.benefits = patch.benefits.join("\n");
    if (patch.skills !== undefined) payload.skills = patch.skills;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.closingDate !== undefined) payload.application_deadline = patch.closingDate;

    const { data, error } = await this.table("jobs")
      .update(payload)
      .eq("id", id)
      .eq("recruiter_id", recruiterId)
      .select("*")
      .single();

    if (error) this.fail(error.message);

    return this.mapRow(data as Record<string, unknown>);
  }

  async duplicateJob(id: string): Promise<Job> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data: original, error: fetchError } = await this.table("jobs")
      .select("*")
      .eq("id", id)
      .eq("recruiter_id", recruiterId)
      .maybeSingle();

    if (fetchError || !original) {
      throw new AppError("Job not found", "NOT_FOUND", 404);
    }

    const source = original as Record<string, unknown>;
    const now = new Date().toISOString();
    const payload = {
      recruiter_id: recruiterId,
      title: `${source.title as string} (copy)`,
      department: source.department,
      employment_type: source.employment_type,
      workplace_type: source.workplace_type,
      location: source.location,
      min_salary: source.min_salary,
      max_salary: source.max_salary,
      currency: source.currency,
      description: source.description,
      responsibilities: source.responsibilities,
      requirements: source.requirements,
      benefits: source.benefits,
      skills: source.skills,
      status: "draft",
      application_deadline: source.application_deadline,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.table("jobs").insert(payload).select("*").single();

    if (error) this.fail(error.message);

    return this.mapRow(data as Record<string, unknown>);
  }

  async setJobStatus(id: string, status: JobStatus): Promise<Job> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data, error } = await this.table("jobs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recruiter_id", recruiterId)
      .select("*")
      .single();

    if (error) this.fail(error.message);

    return this.mapRow(data as Record<string, unknown>);
  }

  async deleteJob(id: string): Promise<{ id: string }> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { error } = await this.table("jobs")
      .delete()
      .eq("id", id)
      .eq("recruiter_id", recruiterId);

    if (error) this.fail(error.message);

    return { id };
  }

  // ---------------- APPLICANTS ----------------

  /**
   * Hydrates raw application rows into full `Applicant` objects by joining
   * candidate profiles, experience, education, projects, skills, resumes,
   * resume analyses and recruiter notes.
   */
  private async buildApplicants(applications: ApplicationRow[]): Promise<Applicant[]> {
    if (!applications.length) return [];

    const userIds = Array.from(new Set(applications.map((row) => row.user_id)));
    const jobIds = Array.from(new Set(applications.map((row) => row.job_id)));
    const applicationIds = applications.map((row) => row.id);

    const [
      jobsResult,
      profilesResult,
      experienceResult,
      educationResult,
      projectsResult,
      skillsResult,
      resumesResult,
      analysesResult,
      notesResult,
      emailsResult,
      tagsResult,
      stageEventsResult,
    ] = await Promise.all([
      this.table("jobs").select("id, title, skills").in("id", jobIds),
      this.table("candidate_profiles")
        .select("user_id, full_name, bio, phone, location, profile_photo_url")
        .in("user_id", userIds),
      this.table("experience")
        .select(
          "id, user_id, company_name, job_title, start_date, end_date, currently_working, description",
        )
        .in("user_id", userIds),
      this.table("education")
        .select("id, user_id, institution, degree, start_date, end_date")
        .in("user_id", userIds),
      this.table("projects")
        .select("id, user_id, title, description, live_url, github_url")
        .in("user_id", userIds),
      this.table("skills").select("id, user_id, skill_name").in("user_id", userIds),
      this.table("resumes")
        .select("id, user_id, file_name, original_file_name, is_active, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
      this.table("resume_analyses")
        .select("id, user_id, overall_score, strengths, weaknesses, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
      this.table("application_notes")
        .select("id, application_id, author, body, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false }),
      (this.client as unknown as SupabaseClient).rpc("recruiter_applicant_emails"),
      this.table("application_tags")
        .select("id, application_id, tag")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: true }),
      this.table("application_stage_events")
        .select("id, application_id, from_stage, to_stage, actor, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false }),
    ]);

    const jobs = (jobsResult.data ?? []) as { id: string; title: string; skills: string[] | null }[];
    const profiles = groupBy((profilesResult.data ?? []) as ProfileRow[], (row) => row.user_id);
    const experience = groupBy(
      (experienceResult.data ?? []) as ExperienceRow[],
      (row) => row.user_id,
    );
    const education = groupBy((educationResult.data ?? []) as EducationRow[], (row) => row.user_id);
    const projects = groupBy((projectsResult.data ?? []) as ProjectRow[], (row) => row.user_id);
    const skills = groupBy((skillsResult.data ?? []) as SkillRow[], (row) => row.user_id);
    const resumes = groupBy((resumesResult.data ?? []) as ResumeRow[], (row) => row.user_id);
    const analyses = groupBy(
      (analysesResult.data ?? []) as ResumeAnalysisRow[],
      (row) => row.user_id,
    );
    const notes = groupBy((notesResult.data ?? []) as NoteRow[], (row) => row.application_id);
    const tags = groupBy((tagsResult.data ?? []) as TagRow[], (row) => row.application_id);
    const stageEvents = groupBy(
      (stageEventsResult.data ?? []) as StageEventRow[],
      (row) => row.application_id,
    );
    const emails = new Map(
      ((emailsResult.data ?? []) as EmailRow[]).map((row) => [row.user_id, row.email]),
    );
    const jobById = new Map(jobs.map((job) => [job.id, job]));

    return applications.map((application) => {
      const userId = application.user_id;
      const job = jobById.get(application.job_id);
      const profile = profiles.get(userId)?.[0];
      const experienceRows = experience.get(userId) ?? [];
      const educationRows = education.get(userId) ?? [];
      const projectRows = projects.get(userId) ?? [];
      const skillRows = skills.get(userId) ?? [];
      const resumeRows = resumes.get(userId) ?? [];
      const analysis = analyses.get(userId)?.[0];
      const email = emails.get(userId) ?? "";

      const candidateSkills = skillRows.map((row) => row.skill_name);
      const experienceYears = totalExperienceYears(experienceRows);
      const { matchedSkills, missingSkills, skillScore } = matchSkills(
        job?.skills ?? [],
        candidateSkills,
      );
      const resumeScore = analysis?.overall_score ?? 0;
      const matchScore = fitScore({ skillScore, resumeScore, experienceYears });

      const sortedExperience = [...experienceRows].sort((a, b) =>
        (b.start_date ?? "").localeCompare(a.start_date ?? ""),
      );
      const latest = sortedExperience[0];
      const activeResume = resumeRows.find((row) => row.is_active) ?? resumeRows[0];

      const mappedExperience: ApplicantExperience[] = sortedExperience.map((row) => ({
        id: row.id,
        company: row.company_name,
        title: row.job_title,
        period: formatPeriod(row.start_date, row.end_date, row.currently_working),
        summary: row.description ?? "",
      }));

      const mappedEducation: ApplicantEducation[] = educationRows.map((row) => ({
        id: row.id,
        school: row.institution,
        degree: row.degree,
        period: formatPeriod(row.start_date, row.end_date),
      }));

      const mappedProjects: ApplicantProject[] = projectRows.map((row) => ({
        id: row.id,
        name: row.title,
        description: row.description ?? "",
        link: row.live_url ?? row.github_url ?? undefined,
      }));

      const mappedNotes: ApplicantNote[] = (notes.get(application.id) ?? []).map((row) => ({
        id: row.id,
        author: row.author ?? "Recruiter",
        body: row.body,
        createdAt: row.created_at,
      }));

      const strengths = analysis?.strengths?.length
        ? analysis.strengths
        : derivedStrengths(matchedSkills, experienceYears);
      const weaknesses = analysis?.weaknesses?.length
        ? analysis.weaknesses
        : derivedWeaknesses(missingSkills, Boolean(analysis));

      return {
        id: application.id,
        jobId: application.job_id,
        jobTitle: job?.title ?? "Unknown role",
        name: profile?.full_name ?? email.split("@")[0] ?? "Candidate",
        headline: latest
          ? `${latest.job_title} · ${latest.company_name}`
          : (profile?.bio ?? "Candidate"),
        email,
        phone: profile?.phone ?? "",
        location: profile?.location ?? "",
        avatarUrl: profile?.profile_photo_url ?? undefined,
        stage: toStage(application.status),
        appliedAt: application.created_at,
        experienceYears,
        educationLevel: highestEducationLevel(educationRows),
        skills: candidateSkills,
        source: application.source ?? "direct",
        resumeFileName: activeResume?.original_file_name ?? activeResume?.file_name ?? "resume",
        portfolioUrl: projectRows.find((row) => row.live_url)?.live_url ?? undefined,
        socials: [],
        experience: mappedExperience,
        education: mappedEducation,
        projects: mappedProjects,
        certifications: [],
        notes: mappedNotes,
        ai: {
          resumeScore,
          matchScore,
          matchedSkills,
          missingSkills,
          strengths,
          weaknesses,
          recommendation: recommendationFor(matchScore, missingSkills),
        },
        tags: (tags.get(application.id) ?? []).map((row) => row.tag),
        stageHistory: (stageEvents.get(application.id) ?? []).map(
          (row): ApplicantStageEvent => ({
            id: row.id,
            fromStage: row.from_stage ? toStage(row.from_stage) : null,
            toStage: toStage(row.to_stage),
            actor: row.actor ?? "Recruiter",
            createdAt: row.created_at,
          }),
        ),
      } satisfies Applicant;
    });
  }

  private async fetchApplications(recruiterId: string): Promise<ApplicationRow[]> {
    const { data, error } = await this.table("applications")
      .select("id, job_id, user_id, recruiter_id, status, source, created_at, updated_at")
      .eq("recruiter_id", recruiterId)
      .order("created_at", { ascending: false });

    if (error) this.fail(error.message);

    return (data ?? []) as ApplicationRow[];
  }

  async listApplicants(): Promise<Applicant[]> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);
    const applications = await this.fetchApplications(recruiterId);
    return this.buildApplicants(applications);
  }

  async getApplicant(id: string): Promise<Applicant | null> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data, error } = await this.table("applications")
      .select("id, job_id, user_id, recruiter_id, status, source, created_at, updated_at")
      .eq("id", id)
      .eq("recruiter_id", recruiterId)
      .maybeSingle();

    if (error) this.fail(error.message);
    if (!data) return null;

    const [applicant] = await this.buildApplicants([data as ApplicationRow]);
    return applicant ?? null;
  }

  async setApplicantStage(id: string, stage: PipelineStage): Promise<Applicant> {
    const recruiter = await this.getRecruiter();
    await this.moveApplications([id], stage, recruiter);

    const applicant = await this.getApplicant(id);
    if (!applicant) throw new AppError("Applicant not found", "NOT_FOUND", 404);
    return applicant;
  }

  async bulkSetApplicantStage(ids: string[], stage: PipelineStage): Promise<Applicant[]> {
    if (!ids.length) return [];

    const recruiter = await this.getRecruiter();
    await this.moveApplications(ids, stage, recruiter);

    const { data, error } = await this.table("applications")
      .select("id, job_id, user_id, recruiter_id, status, source, created_at, updated_at")
      .eq("recruiter_id", recruiter.id)
      .in("id", ids);

    if (error) this.fail(error.message);

    return this.buildApplicants((data ?? []) as ApplicationRow[]);
  }

  /**
   * Moves one or more applications to a stage and records the transition in
   * `application_stage_events` so the candidate timeline stays auditable.
   */
  private async moveApplications(
    ids: string[],
    stage: PipelineStage,
    recruiter: { id: string; fullName: string },
  ): Promise<void> {
    const { data: current, error: readError } = await this.table("applications")
      .select("id, status")
      .eq("recruiter_id", recruiter.id)
      .in("id", ids);

    if (readError) this.fail(readError.message);

    const previous = new Map(
      ((current ?? []) as { id: string; status: string | null }[]).map((row) => [
        row.id,
        toStage(row.status),
      ]),
    );

    const { error } = await this.table("applications")
      .update({ status: stage, updated_at: new Date().toISOString() })
      .eq("recruiter_id", recruiter.id)
      .in("id", ids);

    if (error) this.fail(error.message);

    const events = ids
      .filter((id) => previous.get(id) !== stage)
      .map((id) => ({
        application_id: id,
        recruiter_id: recruiter.id,
        from_stage: previous.get(id) ?? null,
        to_stage: stage,
        actor: recruiter.fullName,
      }));

    if (events.length) {
      // Stage history is best-effort: a missing table must not block the move.
      await this.table("application_stage_events").insert(events);
    }
  }

  async addApplicantNote(id: string, body: string): Promise<Applicant> {
    const recruiter = await this.getRecruiter();

    const { error } = await this.table("application_notes").insert({
      application_id: id,
      recruiter_id: recruiter.id,
      author: recruiter.fullName,
      body,
    });

    if (error) this.fail(error.message);

    const applicant = await this.getApplicant(id);
    if (!applicant) throw new AppError("Applicant not found", "NOT_FOUND", 404);
    return applicant;
  }

  async addApplicantTag(id: string, tag: string): Promise<Applicant> {
    const recruiter = await this.getRecruiter();
    const value = tag.trim();
    if (!value) throw new AppError("A tag is required", "VALIDATION_ERROR", 400);

    const { error } = await this.table("application_tags").upsert(
      { application_id: id, recruiter_id: recruiter.id, tag: value },
      { onConflict: "application_id,tag" },
    );

    if (error) this.fail(error.message);

    const applicant = await this.getApplicant(id);
    if (!applicant) throw new AppError("Applicant not found", "NOT_FOUND", 404);
    return applicant;
  }

  async removeApplicantTag(id: string, tag: string): Promise<Applicant> {
    const recruiter = await this.getRecruiter();

    const { error } = await this.table("application_tags")
      .delete()
      .eq("application_id", id)
      .eq("recruiter_id", recruiter.id)
      .eq("tag", tag);

    if (error) this.fail(error.message);

    const applicant = await this.getApplicant(id);
    if (!applicant) throw new AppError("Applicant not found", "NOT_FOUND", 404);
    return applicant;
  }


  // ---------------- INTERVIEWS ----------------

  async listInterviews(): Promise<Interview[]> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { data, error } = await this.table("interviews")
      .select(
        "id, recruiter_id, application_id, job_id, stage, state, scheduled_at, duration_minutes, mode, location, panel, notes, feedback",
      )
      .eq("recruiter_id", recruiterId)
      .order("scheduled_at", { ascending: false });

    if (error) this.fail(error.message);

    const rows = (data ?? []) as InterviewRow[];
    if (!rows.length) return [];

    const applicationIds = Array.from(new Set(rows.map((row) => row.application_id)));
    const jobIds = Array.from(new Set(rows.map((row) => row.job_id)));

    const [applicationsResult, jobsResult] = await Promise.all([
      this.table("applications").select("id, user_id").in("id", applicationIds),
      this.table("jobs").select("id, title").in("id", jobIds),
    ]);

    const applications = (applicationsResult.data ?? []) as { id: string; user_id: string }[];
    const jobById = new Map(
      ((jobsResult.data ?? []) as { id: string; title: string }[]).map((job) => [job.id, job.title]),
    );

    const userIds = Array.from(new Set(applications.map((row) => row.user_id)));
    const { data: profileData } = await this.table("candidate_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const nameByUser = new Map(
      ((profileData ?? []) as { user_id: string; full_name: string | null }[]).map((row) => [
        row.user_id,
        row.full_name ?? "Candidate",
      ]),
    );
    const userByApplication = new Map(applications.map((row) => [row.id, row.user_id]));

    return rows.map((row) => this.mapInterview(row, userByApplication, nameByUser, jobById));
  }

  private mapInterview(
    row: InterviewRow,
    userByApplication: Map<string, string>,
    nameByUser: Map<string, string>,
    jobById: Map<string, string>,
  ): Interview {
    const applicantUserId = userByApplication.get(row.application_id);
    return {
      id: row.id,
      applicantId: row.application_id,
      applicantName: applicantUserId ? (nameByUser.get(applicantUserId) ?? "Candidate") : "Candidate",
      jobId: row.job_id,
      jobTitle: jobById.get(row.job_id) ?? "Unknown role",
      stage: row.stage as InterviewStage,
      state: row.state as InterviewState,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      mode: row.mode as Interview["mode"],
      location: row.location ?? "",
      panel: row.panel ?? [],
      notes: row.notes ?? "",
      feedback: row.feedback ?? undefined,
    };
  }

  async saveInterview(interview: Interview): Promise<Interview> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const payload: Record<string, unknown> = {
      recruiter_id: recruiterId,
      application_id: interview.applicantId,
      job_id: interview.jobId,
      stage: interview.stage,
      state: interview.state,
      scheduled_at: interview.scheduledAt,
      duration_minutes: interview.durationMinutes,
      mode: interview.mode,
      location: interview.location,
      panel: interview.panel,
      notes: interview.notes,
      feedback: interview.feedback ?? null,
      updated_at: new Date().toISOString(),
    };

    if (UUID_RE.test(interview.id)) payload.id = interview.id;

    const { data, error } = await this.table("interviews")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();

    if (error) this.fail(error.message);

    return { ...interview, id: (data as { id: string }).id };
  }

  // ---------------- DASHBOARD ----------------

  async getOverview(): Promise<HiringOverview> {
    const [jobs, applicants, interviews] = await Promise.all([
      this.listJobs(),
      this.listApplicants(),
      this.listInterviews(),
    ]);

    const today = new Date().toDateString();

    const pipeline = STAGES.map((stage) => ({
      stage,
      count: applicants.filter((applicant) => applicant.stage === stage).length,
    }));

    const hired = applicants.filter((applicant) => applicant.stage === "hired");
    const hireDurations = hired
      .map((applicant) => {
        const interview = interviews.find((item) => item.applicantId === applicant.id);
        const end = interview ? new Date(interview.scheduledAt).getTime() : Date.now();
        return Math.max(0, Math.round((end - new Date(applicant.appliedAt).getTime()) / DAY_MS));
      })
      .filter((days) => days > 0);

    return {
      openPositions: jobs.filter((job) => job.status === "active" || job.status === "paused").length,
      activeJobs: jobs.filter((job) => job.status === "active").length,
      newApplicants: applicants.filter(
        (applicant) => Date.now() - new Date(applicant.appliedAt).getTime() < 7 * DAY_MS,
      ).length,
      interviewsToday: interviews.filter(
        (interview) =>
          interview.state === "scheduled" &&
          new Date(interview.scheduledAt).toDateString() === today,
      ).length,
      offersOut: applicants.filter((applicant) => applicant.stage === "offer").length,
      avgTimeToHire: hireDurations.length
        ? Math.round(hireDurations.reduce((sum, days) => sum + days, 0) / hireDurations.length)
        : 0,
      pipeline,
      aiInsights: this.buildInsights(jobs, applicants),
      activity: this.buildActivity(jobs, applicants, interviews),
    };
  }

  /** Data-driven insights computed locally — no external AI calls. */
  private buildInsights(jobs: Job[], applicants: Applicant[]): HiringOverview["aiInsights"] {
    const insights: HiringOverview["aiInsights"] = [];

    const strong = applicants.filter(
      (applicant) => applicant.ai.matchScore >= 85 && applicant.stage !== "rejected",
    );
    if (strong.length) {
      const topJob = strong[0]!.jobTitle;
      insights.push({
        id: "insight-strong-fit",
        title: `${strong.length} high-fit candidate${strong.length > 1 ? "s" : ""} waiting`,
        body: `${strong.length} applicant${strong.length > 1 ? "s score" : " scores"} 85%+ against role requirements, starting with ${topJob}. Move them forward.`,
        tone: "positive",
      });
    }

    const stalled = jobs.filter(
      (job) =>
        job.status === "active" &&
        !applicants.some((applicant) => applicant.jobId === job.id),
    );
    if (stalled.length) {
      insights.push({
        id: "insight-no-applicants",
        title: `${stalled.length} active job${stalled.length > 1 ? "s have" : " has"} no applicants`,
        body: `${stalled.map((job) => job.title).slice(0, 3).join(", ")} received no applications yet. Refresh the posting or widen the requirements.`,
        tone: "warning",
      });
    }

    const bySource = groupBy(applicants, (applicant) => applicant.source);
    if (bySource.size > 1) {
      const ranked = [...bySource.entries()].sort((a, b) => b[1].length - a[1].length);
      const [topSource, rows] = ranked[0]!;
      insights.push({
        id: "insight-source",
        title: `${topSource} drives most applications`,
        body: `${rows.length} of ${applicants.length} applications came through ${topSource}.`,
        tone: "info",
      });
    }

    return insights;
  }

  private buildActivity(
    jobs: Job[],
    applicants: Applicant[],
    interviews: Interview[],
  ): ActivityItem[] {
    const items: ActivityItem[] = [];

    for (const applicant of applicants) {
      items.push({
        id: `activity-application-${applicant.id}`,
        actor: applicant.name,
        action: "applied to",
        target: applicant.jobTitle,
        at: applicant.appliedAt,
        type: "application",
      });

      const note = applicant.notes[0];
      if (note) {
        items.push({
          id: `activity-note-${note.id}`,
          actor: note.author,
          action: "added a note on",
          target: applicant.name,
          at: note.createdAt,
          type: "note",
        });
      }
    }

    for (const interview of interviews) {
      items.push({
        id: `activity-interview-${interview.id}`,
        actor: interview.applicantName,
        action: interview.state === "completed" ? "completed an interview for" : "is interviewing for",
        target: interview.jobTitle,
        at: interview.scheduledAt,
        type: "interview",
      });
    }

    for (const job of jobs) {
      items.push({
        id: `activity-job-${job.id}`,
        actor: "You",
        action: job.status === "active" ? "published" : "created",
        target: job.title,
        at: job.createdAt,
        type: "job",
      });
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);
  }

  // ---------------- ANALYTICS ----------------

  async getAnalytics(): Promise<RecruiterAnalytics> {
    const [jobs, applicants, interviews] = await Promise.all([
      this.listJobs(),
      this.listApplicants(),
      this.listInterviews(),
    ]);

    const months = lastMonths(6);
    const applicantsByMonth = groupBy(applicants, (applicant) => monthKey(applicant.appliedAt));
    const interviewsByMonth = groupBy(interviews, (interview) => monthKey(interview.scheduledAt));

    const qualifiedStages: PipelineStage[] = ["shortlisted", "interview", "offer", "hired"];

    const applicationsOverTime = months.map((month) => {
      const rows = applicantsByMonth.get(month.key) ?? [];
      return {
        label: month.label,
        applications: rows.length,
        qualified: rows.filter((row) => qualifiedStages.includes(row.stage)).length,
      };
    });

    const reachedStage = (stage: PipelineStage) =>
      applicants.filter(
        (applicant) =>
          applicant.stage !== "rejected" && stageIndex(applicant.stage) >= stageIndex(stage),
      ).length;

    const funnel: SeriesPoint[] = FUNNEL_STAGES.map((stage) => ({
      label: STAGE_LABEL[stage],
      value: reachedStage(stage),
    }));

    const timeToHire: SeriesPoint[] = months.map((month) => {
      const hired = (applicantsByMonth.get(month.key) ?? []).filter(
        (applicant) => applicant.stage === "hired",
      );
      const durations = hired.map((applicant) => {
        const interview = interviews.find((item) => item.applicantId === applicant.id);
        const end = interview ? new Date(interview.scheduledAt).getTime() : Date.now();
        return Math.max(0, Math.round((end - new Date(applicant.appliedAt).getTime()) / DAY_MS));
      });
      return {
        label: month.label,
        value: durations.length
          ? Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length)
          : 0,
      };
    });

    const offerAcceptance = months.map((month) => {
      const rows = applicantsByMonth.get(month.key) ?? [];
      return {
        label: month.label,
        accepted: rows.filter((row) => row.stage === "hired").length,
        declined: rows.filter((row) => row.stage === "rejected").length,
      };
    });

    const sources: SeriesPoint[] = [...groupBy(applicants, (row) => row.source).entries()]
      .map(([label, rows]) => ({ label, value: rows.length }))
      .sort((a, b) => b.value - a.value);

    const applied = applicants.length || 1;
    const interviewConversion: SeriesPoint[] = FUNNEL_STAGES.slice(1).map((stage) => ({
      label: STAGE_LABEL[stage],
      value: Math.round((reachedStage(stage) / applied) * 100),
    }));

    const recruiterActivity = months.map((month) => ({
      label: month.label,
      screens: (applicantsByMonth.get(month.key) ?? []).filter(
        (row) => row.stage !== "applied" && row.stage !== "rejected",
      ).length,
      interviews: (interviewsByMonth.get(month.key) ?? []).length,
    }));

    const jobPerformance = jobs
      .filter((job) => job.status !== "archived")
      .map((job) => {
        const rows = applicants.filter((applicant) => applicant.jobId === job.id);
        const hires = rows.filter((applicant) => applicant.stage === "hired").length;
        return {
          job: job.title,
          applicants: rows.length,
          hires,
          conversion: rows.length ? Math.round((hires / rows.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.applicants - a.applicants);

    return {
      applicationsOverTime,
      funnel,
      timeToHire,
      offerAcceptance,
      sources,
      interviewConversion,
      recruiterActivity,
      jobPerformance,
    };
  }

  // ---------------- AI WORKSPACE ----------------

  /** Calls the server-side AI route (Lovable AI Gateway). */
  private async callAi<T>(body: Record<string, unknown>): Promise<T | null> {
    try {
      const response = await fetch("/api/recruiter-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        throw new AppError("AI is rate limited. Try again in a moment.", "RATE_LIMITED", 429);
      }
      if (response.status === 402) {
        throw new AppError("AI credits are exhausted for this workspace.", "FORBIDDEN", 402);
      }
      if (!response.ok) return null;

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AppError) throw error;
      return null;
    }
  }

  async runAiRanking(jobId: string): Promise<AiWorkspaceResult> {
    const [job, applicants] = await Promise.all([this.getJob(jobId), this.listApplicants()]);
    const shortlist = applicants.filter((applicant) => applicant.jobId === jobId);

    if (!shortlist.length) {
      throw new AppError("No applicants to rank for this job.", "NOT_FOUND", 404);
    }

    const rankings = shortlist
      .map((applicant) => ({
        applicantId: applicant.id,
        name: applicant.name,
        jobTitle: applicant.jobTitle,
        fitScore: applicant.ai.matchScore,
        matchedSkills: applicant.ai.matchedSkills,
        missingSkills: applicant.ai.missingSkills,
        recommendation: applicant.ai.recommendation,
      }))
      .sort((a, b) => b.fitScore - a.fitScore);

    const top = rankings.filter((ranking) => ranking.fitScore >= 75).length;
    const fallbackSummary = `Ranked ${rankings.length} applicant${rankings.length > 1 ? "s" : ""} on skills, experience and resume analysis. ${top} scored 75% or higher.`;

    // Scores stay deterministic; the LLM writes the shortlist narrative.
    const ai = await this.callAi<{ summary?: string; notes?: Record<string, string> }>({
      mode: "rank",
      job: job
        ? { title: job.title, skills: job.skills, description: job.description }
        : { title: shortlist[0]?.jobTitle ?? "Role", skills: [], description: "" },
      candidates: rankings.slice(0, 12).map((ranking) => ({
        id: ranking.applicantId,
        name: ranking.name,
        fitScore: ranking.fitScore,
        matchedSkills: ranking.matchedSkills,
        missingSkills: ranking.missingSkills,
      })),
    });

    return {
      jobId,
      generatedAt: new Date().toISOString(),
      rankings: rankings.map((ranking) => ({
        ...ranking,
        recommendation: ai?.notes?.[ranking.applicantId]?.trim() || ranking.recommendation,
      })),
      summary: ai?.summary?.trim() || fallbackSummary,
    };
  }

  async generateScreeningQuestions(jobId: string, brief: string): Promise<string[]> {
    const job = await this.getJob(jobId);
    if (!job) throw new AppError("Job not found", "NOT_FOUND", 404);

    const result = await this.callAi<{ questions?: string[] }>({
      mode: "questions",
      job: {
        title: job.title,
        skills: job.skills,
        description: job.description,
        requirements: job.requirements,
      },
      brief: brief.slice(0, 2000),
    });

    const questions = (result?.questions ?? [])
      .map((question) => String(question).trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!questions.length) {
      throw new AppError("The AI service returned no questions.", "SERVER_ERROR", 500);
    }

    return questions;
  }

  // ---------------- SETTINGS ----------------
  // The workspace blob lives in `recruiter_workspace_settings`; company and
  // recruiter identity fields are read from `recruiters` / `companies`.

  private defaultSettings(
    recruiter: Record<string, unknown>,
    company: Record<string, unknown> | null,
  ): RecruiterSettings {
    const text = (source: Record<string, unknown> | null, key: string, fallback = "") =>
      ((source?.[key] as string | null) ?? "") || fallback;

    return {
      company: {
        name: text(company, "company_name") || text(recruiter, "company_name"),
        website: text(company, "website") || text(recruiter, "company_website"),
        industry: text(company, "industry") || text(recruiter, "company_industry"),
        size: text(company, "company_size") || text(recruiter, "company_size"),
        headquarters:
          text(company, "city") || text(recruiter, "company_headquarters"),
        about: text(company, "description"),
      },
      branding: {
        primaryColor: "#2563eb",
        logoText: text(company, "company_name") || text(recruiter, "company_name"),
        careersTagline: "",
      },
      team: [
        {
          id: text(recruiter, "id"),
          name: text(recruiter, "full_name", "Recruiter"),
          email: text(recruiter, "work_email"),
          role: "owner",
          status: "active",
        },
      ],
      permissions: [
        {
          id: "manage-jobs",
          label: "Manage jobs",
          description: "Create, edit and publish job postings.",
          enabled: true,
        },
        {
          id: "move-candidates",
          label: "Move candidates",
          description: "Change pipeline stages and send offers.",
          enabled: true,
        },
        {
          id: "view-analytics",
          label: "View analytics",
          description: "Access hiring performance reports.",
          enabled: true,
        },
      ],
      notifications: [
        {
          id: "new-application",
          label: "New applications",
          description: "Email me when a candidate applies.",
          enabled: true,
        },
        {
          id: "interview-reminder",
          label: "Interview reminders",
          description: "Remind me before scheduled interviews.",
          enabled: true,
        },
      ],
      security: { twoFactor: false, ssoEnforced: false, sessionTimeoutMinutes: 60 },
      subscription: { plan: "Starter", seats: 1, usedSeats: 1, renewsOn: "" },
      preferences: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: "DD MMM YYYY",
        defaultJobVisibility: "public",
      },
    };
  }

  async getSettings(): Promise<RecruiterSettings> {
    const userId = await this.getCurrentUserId();

    const { data: recruiterRow, error } = await this.table("recruiters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !recruiterRow) {
      throw new AppError("Recruiter profile not found", "NOT_FOUND", 404);
    }

    const recruiter = recruiterRow as Record<string, unknown>;
    const recruiterId = recruiter["id"] as string;

    const [companyResult, settingsResult] = await Promise.all([
      this.table("companies").select("*").eq("recruiter_id", recruiterId).maybeSingle(),
      this.table("recruiter_workspace_settings")
        .select("settings")
        .eq("recruiter_id", recruiterId)
        .maybeSingle(),
    ]);

    const defaults = this.defaultSettings(
      recruiter,
      (companyResult.data as Record<string, unknown> | null) ?? null,
    );

    const stored = (settingsResult.data as { settings: Partial<RecruiterSettings> } | null)
      ?.settings;

    return stored ? { ...defaults, ...stored } : defaults;
  }

  async saveSettings(settings: RecruiterSettings): Promise<RecruiterSettings> {
    const userId = await this.getCurrentUserId();
    const recruiterId = await this.getRecruiterId(userId);

    const { error } = await this.table("recruiter_workspace_settings").upsert(
      { recruiter_id: recruiterId, settings, updated_at: new Date().toISOString() },
      { onConflict: "recruiter_id" },
    );

    if (error) this.fail(error.message);

    return settings;
  }
}
