/**
 * Supabase-backed Candidate repository.
 *
 * Implements the full `CandidateRepository` contract against the live
 * database. No fixtures, no generated scores — every value returned here comes
 * from Supabase.
 *
 * Tables used:
 *   candidate_profiles, candidate_preferences, education, experience,
 *   projects, skills, resumes, resume_analyses, applications, jobs,
 *   companies, interviews, saved_jobs, profile_completion,
 *   onboarding_progress
 */

import { BaseRepository } from "@/repositories/base.repository";
import type { ApplyOptions } from "@/repositories/candidate.repository";
import { AppError } from "@/lib/errors";
import type {
  AnalysisOutcome,
  Application,
  ApplicationEvent,
  ApplicationStatus,
  CandidateAnalytics,
  CandidateDashboardData,
  CandidateProfile,
  CandidateSettings,
  CareerPreferences,
  DashboardNotification,
  Education,
  Experience,
  Interview,
  Job,
  JobFilters,
  OnboardingData,
  OnboardingState,
  OnboardingStepId,
  ProfileCompletion,
  ProjectItem,
  Proficiency,
  PrepOverview,
  ResumeAnalysis,
  ResumeFile,
  Skill,
  SkillGap,
  TrendPoint,
} from "@/types/candidate";

/* -------------------------------------------------------------------------- */
/*                                  Row types                                 */
/* -------------------------------------------------------------------------- */

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  headline?: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  profile_photo_url: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  twitter_url?: string | null;
  website_url?: string | null;
  profile_views?: number | null;
  updated_at?: string | null;
}

interface PreferencesRow {
  desired_roles: string[] | null;
  locations: string[] | null;
  work_mode: string | null;
  min_salary: number | null;
  notice_period: string | null;
  open_to_relocate: boolean | null;
}

interface SkillRow {
  id: string;
  skill_name: string;
  proficiency_level: string | null;
  years_of_experience: number | null;
  category: string | null;
  created_at: string;
}

interface EducationRow {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
}

interface ExperienceRow {
  id: string;
  company_name: string;
  job_title: string;
  employment_type: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  currently_working: boolean | null;
  description: string | null;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  technologies: string[] | null;
  github_url: string | null;
  live_url: string | null;
}

interface ResumeRow {
  id: string;
  file_name: string;
  original_file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
  is_active: boolean | null;
  created_at: string;
}

interface AnalysisRow {
  id: string;
  resume_id: string;
  overall_score: number | null;
  ats_compatibility: number | null;
  section_scores: Record<string, unknown> | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  suggestions: string[] | null;
  keyword_analysis: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
  completed_at: string | null;
}

interface JobRow {
  id: string;
  recruiter_id: string | null;
  title: string;
  department: string | null;
  employment_type: string | null;
  workplace_type: string | null;
  location: string | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  skills: string[] | null;
  status: string | null;
  experience_level?: string | null;
  min_experience?: number | null;
  max_experience?: number | null;
  company_name?: string | null;
  created_at: string;
}

interface CompanyRow {
  id: string;
  recruiter_id: string;
  company_name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
}

interface ApplicationRow {
  id: string;
  job_id: string;
  user_id: string;
  recruiter_id: string | null;
  resume_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface ApplicationEventRow {
  id: string;
  application_id: string;
  status: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface DashboardNotificationRow {
  id: string;
  title: string;
  message: string | null;
  read: boolean | null;
  created_at: string;
}



interface InterviewRow {
  id: string;
  application_id: string;
  job_id: string;
  stage: string | null;
  state: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  mode: string | null;
  panel: unknown;
  notes: string | null;
  feedback: unknown;
}

interface OnboardingRow {
  current_step: string | null;
  completed_steps: string[] | null;
  onboarding_data: OnboardingData | null;
}

interface CompletionRow {
  percentage: number | null;
  completed_sections: string[] | null;
  incomplete_sections: string[] | null;
}

interface SavedJobRow {
  job_id: string;
}

interface CandidateSettingsRow {
  user_id: string;
  language: string;
  timezone: string;
  two_factor: boolean;
  job_alerts: boolean;
  weekly_digest: boolean;
  profile_visible: boolean;
  application_updates: boolean;
  interview_reminders: boolean;
  new_matches: boolean;
  product_news: boolean;
  plan: string;
  renews_on: string;
  ai_credits_used: number;
  ai_credits: number;
}

interface PrepProgressRow {
  question_id: string;
  practiced: boolean;
}


/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const OPEN_JOB_STATUSES = ["open", "published", "active"];

const PROFICIENCY_VALUES: Proficiency[] = ["beginner", "intermediate", "advanced", "expert"];

const PROFICIENCY_SCORE: Record<Proficiency, number> = {
  beginner: 25,
  intermediate: 50,
  advanced: 75,
  expert: 100,
};

const APPLICATION_STATUS_VALUES: ApplicationStatus[] = [
  "applied",
  "under-review",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const NEXT_ACTION: Record<ApplicationStatus, string> = {
  applied: "Wait for recruiter screening",
  "under-review": "The recruiter is reviewing your profile",
  shortlisted: "Prepare for the first interview",
  interview: "Attend your scheduled interview",
  offer: "Review and respond to the offer",
  rejected: "Keep applying to matched roles",
  withdrawn: "You withdrew this application",
};


function toProficiency(value: string | null): Proficiency {
  const normalized = (value ?? "").toLowerCase();
  return PROFICIENCY_VALUES.includes(normalized as Proficiency)
    ? (normalized as Proficiency)
    : "intermediate";
}

function toApplicationStatus(value: string): ApplicationStatus {
  const normalized = value.toLowerCase().replace(/_/g, "-");
  if (APPLICATION_STATUS_VALUES.includes(normalized as ApplicationStatus)) {
    return normalized as ApplicationStatus;
  }
  if (normalized === "screening" || normalized === "review") return "under-review";
  if (normalized === "hired") return "offer";
  return "applied";
}

function toLines(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "CO"
  );
}

function experienceLabel(row: JobRow): string {
  if (row.experience_level) return row.experience_level;
  if (row.min_experience !== null && row.min_experience !== undefined) {
    const max = row.max_experience ?? row.min_experience + 2;
    return `${row.min_experience}-${max} yrs`;
  }
  return "any";
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short" });
}

function lastMonths(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function percentage(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/* -------------------------------------------------------------------------- */
/*                                 Repository                                 */
/* -------------------------------------------------------------------------- */

export class SupabaseCandidateRepository extends BaseRepository {
  /**
   * Untyped table accessor. The generated `Database` type does not yet cover
   * every table used by the candidate module (jobs, applications, interviews,
   * saved_jobs), so rows are validated through the explicit row interfaces
   * declared above instead of the generated types.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table(name: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).from(name);
  }

  private fail(message: string): never {
    throw new AppError(message, "SERVER_ERROR", 500);
  }

  private async rows<T>(
    promise: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ) {
    const { data, error } = await promise;
    if (error) this.fail(error.message);
    return (data ?? []) as T[];
  }

  private async single<T>(
    promise: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ) {
    const { data, error } = await promise;
    if (error) this.fail(error.message);
    return (data ?? null) as T | null;
  }

  private async getSessionUser() {
    const {
      data: { session },
    } = await this.client.auth.getSession();
    if (!session?.user?.id) {
      throw new AppError("Authentication required", "AUTH_REQUIRED", 401);
    }
    return session.user;
  }

  /* ------------------------------- Profile ------------------------------- */

  async getProfile(): Promise<CandidateProfile> {
    const user = await this.getSessionUser();
    const userId = user.id;

    const [profile, preferences, skills, education, experience, projects, completion] =
      await Promise.all([
        this.single<ProfileRow>(
          this.table("candidate_profiles").select("*").eq("user_id", userId).maybeSingle(),
        ),
        this.single<PreferencesRow>(
          this.table("candidate_preferences").select("*").eq("user_id", userId).maybeSingle(),
        ),
        this.rows<SkillRow>(
          this.table("skills")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
        ),
        this.rows<EducationRow>(
          this.table("education")
            .select("*")
            .eq("user_id", userId)
            .order("start_date", { ascending: false }),
        ),
        this.rows<ExperienceRow>(
          this.table("experience")
            .select("*")
            .eq("user_id", userId)
            .order("start_date", { ascending: false }),
        ),
        this.rows<ProjectRow>(
          this.table("projects")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
        ),
        this.single<CompletionRow>(
          this.table("profile_completion").select("*").eq("user_id", userId).maybeSingle(),
        ),
      ]);

    const mappedSkills: Skill[] = skills.map((row) => ({
      id: row.id,
      name: row.skill_name,
      level: toProficiency(row.proficiency_level),
      years: row.years_of_experience ?? undefined,
    }));

    const mappedEducation: Education[] = education.map((row) => ({
      id: row.id,
      institution: row.institution,
      degree: row.degree,
      field: row.field_of_study ?? "",
      startYear: row.start_date ?? "",
      endYear: row.end_date ?? "",
      grade: row.grade ?? undefined,
    }));

    const mappedExperience: Experience[] = experience.map((row) => ({
      id: row.id,
      company: row.company_name,
      title: row.job_title,
      location: row.location ?? undefined,
      startDate: row.start_date ?? "",
      endDate: row.end_date,
      current: Boolean(row.currently_working),
      summary: row.description ?? undefined,
    }));

    const mappedProjects: ProjectItem[] = projects.map((row) => ({
      id: row.id,
      name: row.title,
      description: row.description ?? "",
      url: row.live_url ?? row.github_url ?? undefined,
      tech: row.technologies ?? [],
    }));

    const mappedPreferences: CareerPreferences = {
      desiredRoles: preferences?.desired_roles ?? [],
      locations: preferences?.locations ?? [],
      workMode: (preferences?.work_mode as CareerPreferences["workMode"]) ?? "remote",
      minSalary: preferences?.min_salary ?? 0,
      noticePeriod: preferences?.notice_period ?? "",
      openToRelocate: Boolean(preferences?.open_to_relocate),
    };

    const computed = this.computeCompletion({
      profile,
      skills: mappedSkills,
      education: mappedEducation,
      experience: mappedExperience,
      projects: mappedProjects,
      preferences: mappedPreferences,
    });

    // Completion is always derived from live rows; the stored row is only a
    // cache for other surfaces and can be stale right after a write.
    void completion;

    return {
      id: profile?.id ?? userId,
      fullName: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
      headline: profile?.headline ?? "",
      email: user.email ?? "",
      phone: profile?.phone ?? undefined,
      location: profile?.location ?? undefined,
      bio: profile?.bio ?? "",
      skills: mappedSkills,
      education: mappedEducation,
      experience: mappedExperience,
      projects: mappedProjects,
      certifications: [],
      social: {
        linkedin: profile?.linkedin_url ?? undefined,
        github: profile?.github_url ?? undefined,
        portfolio: profile?.portfolio_url ?? undefined,
        twitter: profile?.twitter_url ?? undefined,
      },
      preferences: mappedPreferences,
      completion: {
        percentage: computed.percentage,
        sections: computed.sections,
      },
    };
  }

  async updateProfile(patch: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const user = await this.getSessionUser();
    const userId = user.id;

    const existing = await this.single<ProfileRow>(
      this.table("candidate_profiles").select("id").eq("user_id", userId).maybeSingle(),
    );

    const profilePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.fullName !== undefined) profilePayload.full_name = patch.fullName;
    if (patch.headline !== undefined) profilePayload.headline = patch.headline;
    if (patch.bio !== undefined) profilePayload.bio = patch.bio;
    if (patch.phone !== undefined) profilePayload.phone = patch.phone ?? null;
    if (patch.location !== undefined) profilePayload.location = patch.location ?? null;
    if (patch.social) {
      profilePayload.linkedin_url = patch.social.linkedin ?? null;
      profilePayload.github_url = patch.social.github ?? null;
      profilePayload.portfolio_url = patch.social.portfolio ?? null;
      profilePayload.twitter_url = patch.social.twitter ?? null;
    }

    if (existing) {
      const { error } = await this.table("candidate_profiles")
        .update(profilePayload)
        .eq("user_id", userId);
      if (error) this.fail(error.message);
    } else {
      const { error } = await this.table("candidate_profiles").insert({
        ...profilePayload,
        user_id: userId,
        full_name: patch.fullName ?? "",
      });
      if (error) this.fail(error.message);
    }

    if (patch.preferences) {
      const preferences = patch.preferences;
      const { error } = await this.table("candidate_preferences").upsert(
        {
          user_id: userId,
          desired_roles: preferences.desiredRoles ?? [],
          locations: preferences.locations ?? [],
          work_mode: preferences.workMode ?? "remote",
          min_salary: preferences.minSalary ?? 0,
          notice_period: preferences.noticePeriod ?? null,
          open_to_relocate: preferences.openToRelocate ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) this.fail(error.message);
    }

    const profile = await this.getProfile();
    await this.persistCompletion(userId, profile);
    return profile;
  }

  /* --------------------------- Profile completion -------------------------- */

  private computeCompletion(input: {
    profile: ProfileRow | null;
    skills: Skill[];
    education: Education[];
    experience: Experience[];
    projects: ProjectItem[];
    preferences: CareerPreferences;
  }): ProfileCompletion {
    const sections = [
      {
        label: "Basic information",
        done: Boolean(input.profile?.full_name && input.profile?.headline),
        weight: 3,
      },
      { label: "About you", done: Boolean(input.profile?.bio), weight: 1 },
      {
        label: "Contact details",
        done: Boolean(input.profile?.phone && input.profile?.location),
        weight: 1,
      },
      { label: "Skills", done: input.skills.length >= 3, weight: 3 },
      { label: "Education", done: input.education.length > 0, weight: 2 },
      { label: "Experience", done: input.experience.length > 0, weight: 3 },
      { label: "Projects", done: input.projects.length > 0, weight: 1 },
      {
        label: "Career preferences",
        done: input.preferences.desiredRoles.length > 0,
        weight: 2,
      },
    ];

    const total = sections.reduce((sum, section) => sum + section.weight, 0);
    const earned = sections.reduce((sum, section) => sum + (section.done ? section.weight : 0), 0);

    return {
      percentage: percentage(earned, total),
      sections: sections.map(({ label, done }) => ({ label, done })),
    };
  }

  private async persistCompletion(userId: string, profile: CandidateProfile): Promise<void> {
    const completed = profile.completion.sections.filter((s) => s.done).map((s) => s.label);
    const incomplete = profile.completion.sections.filter((s) => !s.done).map((s) => s.label);

    const { error } = await this.table("profile_completion").upsert(
      {
        user_id: userId,
        percentage: profile.completion.percentage,
        completed_sections: completed,
        incomplete_sections: incomplete,
        missing_fields: incomplete,
        section_details: profile.completion.sections,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) this.fail(error.message);
  }

  /* -------------------------------- Resumes -------------------------------- */

  async getResumes(): Promise<ResumeFile[]> {
    const userId = await this.getCurrentUserId();
    const rows = await this.rows<ResumeRow>(
      this.table("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false }),
    );

    const total = rows.length;
    return rows.map((row, index) => ({
      id: row.id,
      fileName: row.original_file_name ?? row.file_name,
      sizeKb: Math.max(1, Math.round((row.file_size ?? 0) / 1024)),
      uploadedAt: row.uploaded_at,
      status: row.is_active ? "active" : "archived",
      version: total - index,
    }));
  }

  async uploadResume(file: { name: string; sizeKb: number }): Promise<ResumeFile> {
    const userId = await this.getCurrentUserId();

    const { error: clearError } = await this.table("resumes")
      .update({ is_active: false })
      .eq("user_id", userId);
    if (clearError) this.fail(clearError.message);

    const inserted = await this.single<ResumeRow>(
      this.table("resumes")
        .insert({
          user_id: userId,
          file_name: file.name,
          original_file_name: file.name,
          file_size: Math.round(file.sizeKb * 1024),
          is_active: true,
        })
        .select("*")
        .single(),
    );
    if (!inserted) this.fail("Could not save the resume");

    const resumes = await this.getResumes();
    const created = resumes.find((resume) => resume.id === inserted.id);
    if (!created) this.fail("Could not read the saved resume");
    return created;
  }

  async deleteResume(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const { error } = await this.table("resumes").delete().eq("id", id).eq("user_id", userId);
    if (error) this.fail(error.message);

    const remaining = await this.getResumes();
    if (remaining.length && !remaining.some((resume) => resume.status === "active")) {
      await this.setActiveResume(remaining[0].id);
    }
  }

  async setActiveResume(id: string): Promise<ResumeFile[]> {
    const userId = await this.getCurrentUserId();

    const { error: clearError } = await this.table("resumes")
      .update({ is_active: false })
      .eq("user_id", userId);
    if (clearError) this.fail(clearError.message);

    const { error } = await this.table("resumes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) this.fail(error.message);

    return this.getResumes();
  }

  /* ---------------------------- Resume analyses ---------------------------- */

  private mapAnalysis(row: AnalysisRow): ResumeAnalysis {
    const sectionScores = (row.section_scores ?? {}) as Record<string, unknown>;
    const breakdown = Object.entries(sectionScores)
      .filter(([, value]) => typeof value === "number")
      .map(([label, value]) => ({
        label: label.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
        score: Number(value),
        summary: "",
      }));

    const keywords = (row.keyword_analysis ?? {}) as Record<string, unknown>;
    const missingRaw = keywords.missing ?? keywords.missing_keywords ?? keywords.missingSkills;
    const missingSkills = Array.isArray(missingRaw)
      ? missingRaw.filter((item): item is string => typeof item === "string")
      : [];

    return {
      id: row.id,
      resumeId: row.resume_id,
      createdAt: row.completed_at ?? row.created_at,
      overallScore: row.overall_score ?? 0,
      atsScore: row.ats_compatibility ?? 0,
      breakdown,
      strengths: row.strengths ?? [],
      weaknesses: row.weaknesses ?? [],
      missingSkills,
      suggestions: row.suggestions ?? [],
    };
  }

  async getAnalyses(): Promise<ResumeAnalysis[]> {
    const userId = await this.getCurrentUserId();
    const rows = await this.rows<AnalysisRow>(
      this.table("resume_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    );
    return rows.map((row) => this.mapAnalysis(row));
  }

  /**
   * Returns the stored analysis for a resume. Scores are never invented here —
   * when nothing has been persisted yet the caller is told so.
   */
  async analyzeResume(resumeId: string): Promise<AnalysisOutcome> {
    const userId = await this.getCurrentUserId();
    const row = await this.single<AnalysisRow>(
      this.table("resume_analyses")
        .select("*")
        .eq("user_id", userId)
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );

    if (!row) {
      return {
        kind: "insufficient-data",
        message: "No analysis has been stored for this resume yet.",
      };
    }

    return { kind: "ok", analysis: this.mapAnalysis(row) };
  }

  /* -------------------------------- Skill gap ------------------------------ */

  async getSkillGap(targetRole?: string): Promise<SkillGap> {
    const profile = await this.getProfile();
    const role = targetRole ?? profile.preferences.desiredRoles[0] ?? "Your target role";

    const jobs = await this.rows<JobRow>(
      this.table("jobs")
        .select("*")
        .in("status", OPEN_JOB_STATUSES)
        .order("created_at", { ascending: false })
        .limit(200),
    );

    const relevant = jobs.filter((job) =>
      role === "Your target role" ? true : job.title.toLowerCase().includes(role.toLowerCase()),
    );
    const pool = relevant.length ? relevant : jobs;

    const demand = new Map<string, number>();
    for (const job of pool) {
      for (const skill of job.skills ?? []) {
        const key = skill.trim();
        if (!key) continue;
        demand.set(key, (demand.get(key) ?? 0) + 1);
      }
    }

    const owned = new Map(profile.skills.map((skill) => [skill.name.toLowerCase(), skill]));

    const matching = [...demand.keys()]
      .filter((skill) => owned.has(skill.toLowerCase()))
      .map((skill) => ({
        name: skill,
        level: PROFICIENCY_SCORE[owned.get(skill.toLowerCase())!.level],
      }))
      .sort((a, b) => b.level - a.level);

    const missing = [...demand.entries()]
      .filter(([skill]) => !owned.has(skill.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({
        name: skill,
        priority: (count >= pool.length * 0.4
          ? "high"
          : count >= pool.length * 0.2
            ? "medium"
            : "low") as SkillGap["missing"][number]["priority"],
        demand: percentage(count, Math.max(1, pool.length)),
      }));

    const totalDemanded = matching.length + missing.length;

    return {
      targetRole: role,
      matchScore: percentage(matching.length, Math.max(1, totalDemanded)),
      matching,
      missing,
      recommendations: [],
    };
  }

  /* ---------------------------------- Jobs --------------------------------- */

  private async loadCompanies(recruiterIds: string[]): Promise<Map<string, CompanyRow>> {
    const ids = recruiterIds.filter(Boolean);
    if (!ids.length) return new Map();
    const rows = await this.rows<CompanyRow>(
      this.table("companies").select("*").in("recruiter_id", ids),
    );
    return new Map(rows.map((row) => [row.recruiter_id, row]));
  }

  private async loadSavedJobIds(userId: string): Promise<Set<string>> {
    const rows = await this.rows<SavedJobRow>(
      this.table("saved_jobs").select("job_id").eq("user_id", userId),
    );
    return new Set(rows.map((row) => row.job_id));
  }

  private mapJob(
    row: JobRow,
    company: CompanyRow | undefined,
    savedIds: Set<string>,
    candidateSkills: string[],
  ): Job {
    const jobSkills = row.skills ?? [];
    const owned = new Set(candidateSkills.map((skill) => skill.toLowerCase()));
    const matchingSkills = jobSkills.filter((skill) => owned.has(skill.toLowerCase()));
    const missingSkills = jobSkills.filter((skill) => !owned.has(skill.toLowerCase()));
    const companyName = company?.company_name ?? row.company_name ?? "Confidential company";
    const workplace = (row.workplace_type ?? "").toLowerCase();

    return {
      id: row.id,
      title: row.title,
      company: companyName,
      companyInitials: initials(companyName),
      location: row.location ?? [company?.city, company?.country].filter(Boolean).join(", ") ?? "",
      remote: workplace === "remote" || workplace === "hybrid",
      experience: experienceLabel(row),
      salaryMin: row.min_salary ?? 0,
      salaryMax: row.max_salary ?? 0,
      currency: row.currency ?? "INR",
      skills: jobSkills,
      matchScore: jobSkills.length ? percentage(matchingSkills.length, jobSkills.length) : 0,
      postedAt: row.created_at,
      saved: savedIds.has(row.id),
      type: ((row.employment_type ?? "full-time").toLowerCase() as Job["type"]) ?? "full-time",
      description: row.description ?? "",
      responsibilities: toLines(row.responsibilities),
      requirements: toLines(row.requirements),
      benefits: toLines(row.benefits),
      matchingSkills,
      missingSkills,
    };
  }

  private matchesFilters(job: Job, filters: Partial<JobFilters>): boolean {
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
    if (
      filters.experience &&
      filters.experience !== "any" &&
      !job.experience.toLowerCase().includes(filters.experience.toLowerCase())
    ) {
      return false;
    }
    if (filters.skills?.length) {
      const owned = job.skills.map((skill) => skill.toLowerCase());
      if (!filters.skills.every((skill) => owned.includes(skill.toLowerCase()))) return false;
    }
    return true;
  }

  private sortJobs(list: Job[], sort: JobFilters["sort"] = "relevance"): Job[] {
    const copy = [...list];
    if (sort === "recent") {
      return copy.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
    }
    if (sort === "salary") {
      return copy.sort((a, b) => b.salaryMax - a.salaryMax);
    }
    return copy.sort((a, b) => b.matchScore - a.matchScore);
  }

  private async candidateSkillNames(userId: string): Promise<string[]> {
    const rows = await this.rows<SkillRow>(
      this.table("skills")
        .select("id, skill_name, proficiency_level, years_of_experience, category, created_at")
        .eq("user_id", userId),
    );
    return rows.map((row) => row.skill_name);
  }

  async getJobs(filters: Partial<JobFilters> = {}): Promise<Job[]> {
    const userId = await this.getCurrentUserId();

    const [rows, savedIds, skills] = await Promise.all([
      this.rows<JobRow>(
        this.table("jobs")
          .select("*")
          .in("status", OPEN_JOB_STATUSES)
          .order("created_at", { ascending: false })
          .limit(200),
      ),
      this.loadSavedJobIds(userId),
      this.candidateSkillNames(userId),
    ]);

    const companies = await this.loadCompanies(
      rows.map((row) => row.recruiter_id ?? "").filter(Boolean),
    );

    const jobs = rows.map((row) =>
      this.mapJob(row, companies.get(row.recruiter_id ?? ""), savedIds, skills),
    );

    return this.sortJobs(
      jobs.filter((job) => this.matchesFilters(job, filters)),
      filters.sort,
    );
  }

  async getJob(id: string): Promise<Job | null> {
    const userId = await this.getCurrentUserId();

    const [row, savedIds, skills] = await Promise.all([
      this.single<JobRow>(this.table("jobs").select("*").eq("id", id).maybeSingle()),
      this.loadSavedJobIds(userId),
      this.candidateSkillNames(userId),
    ]);

    if (!row) return null;

    const companies = await this.loadCompanies([row.recruiter_id ?? ""]);
    return this.mapJob(row, companies.get(row.recruiter_id ?? ""), savedIds, skills);
  }

  /* ------------------------------- Saved jobs ------------------------------ */

  async toggleSavedJob(id: string): Promise<Job> {
    const userId = await this.getCurrentUserId();

    const existing = await this.single<{ id: string }>(
      this.table("saved_jobs").select("id").eq("user_id", userId).eq("job_id", id).maybeSingle(),
    );

    if (existing) {
      const { error } = await this.table("saved_jobs").delete().eq("id", existing.id);
      if (error) this.fail(error.message);
    } else {
      const { error } = await this.table("saved_jobs").insert({ user_id: userId, job_id: id });
      if (error) this.fail(error.message);
    }

    const job = await this.getJob(id);
    if (!job) throw new AppError("Job not found", "NOT_FOUND", 404);
    return job;
  }

  async getSavedJobs(): Promise<Job[]> {
    const jobs = await this.getJobs();
    return jobs.filter((job) => job.saved);
  }

  /* ------------------------------ Applications ----------------------------- */

  /**
   * Timeline events are persisted in `application_events` (written by database
   * triggers on insert and on every status change), so the history survives
   * reloads and reflects recruiter-side updates.
   */
  private async loadTimelines(
    applicationIds: string[],
  ): Promise<Map<string, ApplicationEvent[]>> {
    const timelines = new Map<string, ApplicationEvent[]>();
    if (!applicationIds.length) return timelines;

    const rows = await this.rows<ApplicationEventRow>(
      this.table("application_events")
        .select("id, application_id, status, title, description, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: true }),
    );

    for (const row of rows) {
      const event: ApplicationEvent = {
        id: row.id,
        status: toApplicationStatus(row.status),
        date: row.created_at,
        note: row.description ?? row.title,
      };
      timelines.set(row.application_id, [...(timelines.get(row.application_id) ?? []), event]);
    }
    return timelines;
  }

  /** Fallback used only when a row predates the timeline triggers. */
  private buildTimeline(row: ApplicationRow, status: ApplicationStatus): ApplicationEvent[] {
    const events: ApplicationEvent[] = [
      { id: `${row.id}-applied`, status: "applied", date: row.created_at },
    ];
    if (status !== "applied") {
      events.push({
        id: `${row.id}-${status}`,
        status,
        date: row.updated_at ?? row.created_at,
        note: NEXT_ACTION[status],
      });
    }
    return events;
  }

  async getApplications(): Promise<Application[]> {
    const userId = await this.getCurrentUserId();

    const rows = await this.rows<ApplicationRow>(
      this.table("applications")
        .select("id, job_id, user_id, recruiter_id, resume_id, status, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    );

    if (!rows.length) return [];

    const [jobRows, timelines, resumeRows] = await Promise.all([
      this.rows<JobRow>(
        this.table("jobs")
          .select("*")
          .in("id", Array.from(new Set(rows.map((row) => row.job_id)))),
      ),
      this.loadTimelines(rows.map((row) => row.id)),
      this.rows<ResumeRow>(
        this.table("resumes").select("*").eq("user_id", userId),
      ),
    ]);

    const jobById = new Map(jobRows.map((job) => [job.id, job]));
    const resumeById = new Map(resumeRows.map((resume) => [resume.id, resume]));
    const companies = await this.loadCompanies(
      jobRows.map((job) => job.recruiter_id ?? "").filter(Boolean),
    );

    return rows.map((row) => {
      const job = jobById.get(row.job_id);
      const company = job ? companies.get(job.recruiter_id ?? "") : undefined;
      const status = toApplicationStatus(row.status);
      const resume = row.resume_id ? resumeById.get(row.resume_id) : undefined;
      const timeline = timelines.get(row.id);

      return {
        id: row.id,
        jobId: row.job_id,
        jobTitle: job?.title ?? "Role no longer listed",
        company: company?.company_name ?? job?.company_name ?? "Confidential company",
        appliedAt: row.created_at,
        status,
        nextAction: NEXT_ACTION[status],
        notes: resume
          ? `Submitted with ${resume.original_file_name ?? resume.file_name}`
          : undefined,
        timeline: timeline?.length ? timeline : this.buildTimeline(row, status),
      };
    });
  }

  async applyToJob(jobId: string, options?: ApplyOptions): Promise<Application> {
    const userId = await this.getCurrentUserId();

    const existing = await this.single<ApplicationRow>(
      this.table("applications")
        .select("id, job_id, user_id, recruiter_id, resume_id, status, created_at, updated_at")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .maybeSingle(),
    );

    const job = await this.single<JobRow>(
      this.table("jobs").select("*").eq("id", jobId).maybeSingle(),
    );
    if (!job) throw new AppError("Job not found", "NOT_FOUND", 404);

    const companies = await this.loadCompanies([job.recruiter_id ?? ""]);
    const companyName =
      companies.get(job.recruiter_id ?? "")?.company_name ??
      job.company_name ??
      "Confidential company";

    if (existing) {
      const status = toApplicationStatus(existing.status);
      const timelines = await this.loadTimelines([existing.id]);
      const timeline = timelines.get(existing.id);
      return {
        id: existing.id,
        jobId: existing.job_id,
        jobTitle: job.title,
        company: companyName,
        appliedAt: existing.created_at,
        status,
        nextAction: NEXT_ACTION[status],
        timeline: timeline?.length ? timeline : this.buildTimeline(existing, status),
      };
    }

    // Resume selection: an explicit choice wins, otherwise the active resume.
    let resumeId = options?.resumeId ?? null;
    if (resumeId) {
      const owned = await this.single<{ id: string }>(
        this.table("resumes").select("id").eq("id", resumeId).eq("user_id", userId).maybeSingle(),
      );
      if (!owned) throw new AppError("Resume not found", "NOT_FOUND", 404);
    } else {
      const activeResume = await this.single<ResumeRow>(
        this.table("resumes").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      );
      resumeId = activeResume?.id ?? null;
    }

    const inserted = await this.single<ApplicationRow>(
      this.table("applications")
        .insert({
          job_id: job.id,
          recruiter_id: job.recruiter_id,
          user_id: userId,
          status: "applied",
          resume_id: resumeId,
          cover_letter: options?.coverLetter ?? null,
        })
        .select("id, job_id, user_id, recruiter_id, resume_id, status, created_at, updated_at")
        .single(),
    );
    if (!inserted) this.fail("Could not submit the application");

    const timelines = await this.loadTimelines([inserted.id]);
    const timeline = timelines.get(inserted.id);

    return {
      id: inserted.id,
      jobId: inserted.job_id,
      jobTitle: job.title,
      company: companyName,
      appliedAt: inserted.created_at,
      status: "applied",
      nextAction: NEXT_ACTION.applied,
      timeline: timeline?.length ? timeline : this.buildTimeline(inserted, "applied"),
    };
  }

  async withdrawApplication(applicationId: string): Promise<Application> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.table("applications")
      .update({ status: "withdrawn" })
      .eq("id", applicationId)
      .eq("user_id", userId);
    if (error) this.fail(error.message);

    const applications = await this.getApplications();
    const application = applications.find((item) => item.id === applicationId);
    if (!application) throw new AppError("Application not found", "NOT_FOUND", 404);
    return application;
  }


  /* ------------------------------- Interviews ------------------------------ */

  async getInterviews(): Promise<Interview[]> {
    const userId = await this.getCurrentUserId();

    const applications = await this.rows<ApplicationRow>(
      this.table("applications")
        .select("id, job_id, user_id, recruiter_id, status, created_at, updated_at")
        .eq("user_id", userId),
    );
    if (!applications.length) return [];

    const rows = await this.rows<InterviewRow>(
      this.table("interviews")
        .select("*")
        .in(
          "application_id",
          applications.map((application) => application.id),
        )
        .order("scheduled_at", { ascending: true }),
    );
    if (!rows.length) return [];

    const jobRows = await this.rows<JobRow>(
      this.table("jobs")
        .select("*")
        .in("id", Array.from(new Set(rows.map((row) => row.job_id)))),
    );
    const jobById = new Map(jobRows.map((job) => [job.id, job]));
    const companies = await this.loadCompanies(
      jobRows.map((job) => job.recruiter_id ?? "").filter(Boolean),
    );

    return rows.map((row) => {
      const job = jobById.get(row.job_id);
      const company = job ? companies.get(job.recruiter_id ?? "") : undefined;
      const panel = Array.isArray(row.panel) ? (row.panel as { name?: string }[]) : [];
      const state = (row.state ?? "scheduled").toLowerCase();
      const feedback = row.feedback;

      return {
        id: row.id,
        jobTitle: job?.title ?? "Interview",
        company: company?.company_name ?? job?.company_name ?? "Confidential company",
        round: row.stage ?? "Interview",
        mode: ((row.mode ?? "video").toLowerCase() as Interview["mode"]) ?? "video",
        scheduledAt: row.scheduled_at,
        durationMinutes: row.duration_minutes ?? 45,
        interviewer: panel[0]?.name ?? "Hiring panel",
        status:
          state === "completed" || state === "cancelled"
            ? (state as Interview["status"])
            : "scheduled",
        notes: row.notes ?? undefined,
        feedback:
          feedback && typeof feedback === "object"
            ? String((feedback as { summary?: string }).summary ?? "")
            : undefined,
      };
    });
  }

  /* ------------------------------- Analytics ------------------------------- */

  async getAnalytics(): Promise<CandidateAnalytics> {
    const userId = await this.getCurrentUserId();

    const [applications, analyses, skills, completion, events] = await Promise.all([
      this.rows<ApplicationRow>(
        this.table("applications")
          .select("id, job_id, user_id, recruiter_id, resume_id, status, created_at, updated_at")
          .eq("user_id", userId),
      ),
      this.rows<AnalysisRow>(
        this.table("resume_analyses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
      ),
      this.rows<SkillRow>(this.table("skills").select("*").eq("user_id", userId)),
      this.single<CompletionRow>(
        this.table("profile_completion").select("*").eq("user_id", userId).maybeSingle(),
      ),
      this.rows<ApplicationEventRow>(
        this.table("application_events")
          .select("id, application_id, status, title, description, created_at")
          .eq("user_id", userId),
      ),
    ]);

    const months = lastMonths(6);

    const applicationTrend: TrendPoint[] = months.map((key) => ({
      label: monthLabel(key),
      value: applications.filter((row) => monthKey(row.created_at) === key).length,
    }));

    const resumeScoreTrend: TrendPoint[] = analyses.slice(-6).map((row) => ({
      label: new Date(row.completed_at ?? row.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: row.overall_score ?? 0,
    }));

    let cumulative = 0;
    const skillGrowth: TrendPoint[] = months.map((key) => {
      cumulative = skills.filter((row) => monthKey(row.created_at) <= key).length;
      return { label: monthLabel(key), value: cumulative };
    });

    /**
     * Rates are computed from the full timeline, not only the current status:
     * an application that reached interview and was later rejected still counts
     * towards the interview rate.
     */
    const reached = new Map<string, Set<ApplicationStatus>>();
    for (const application of applications) reached.set(application.id, new Set());
    for (const application of applications) {
      reached.get(application.id)?.add(toApplicationStatus(application.status));
    }
    for (const event of events) {
      reached.get(event.application_id)?.add(toApplicationStatus(event.status));
    }

    const total = applications.length;
    const interviewed = [...reached.values()].filter(
      (statuses) => statuses.has("interview") || statuses.has("offer"),
    ).length;
    const offered = [...reached.values()].filter((statuses) => statuses.has("offer")).length;

    return {
      resumeScoreTrend,
      applicationTrend,
      interviewRate: percentage(interviewed, total),
      successRate: percentage(offered, total),
      skillGrowth,
      profileCompletion: (await this.getProfile()).completion.percentage,
    };
  }

  /* -------------------------------- Dashboard ------------------------------ */

  async getDashboard(): Promise<CandidateDashboardData> {
    const userId = await this.getCurrentUserId();

    const [profile, applications, analyses, jobs, interviews, notificationRows] = await Promise.all(
      [
        this.getProfile(),
        this.getApplications(),
        this.getAnalyses(),
        this.getJobs(),
        this.getInterviews(),
        this.rows<DashboardNotificationRow>(
          this.table("notifications")
            .select("id, title, message, read, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(6),
        ),
      ],
    );

    const latest = analyses[0];

    const notifications: DashboardNotification[] = notificationRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.message ?? "",
      createdAt: row.created_at,
      read: row.read ?? false,
    }));

    const insights = (latest?.suggestions ?? []).slice(0, 3).map((suggestion, index) => ({
      id: `insight-${latest?.id ?? "none"}-${index}`,
      title: "Resume suggestion",
      description: suggestion,
    }));

    return {
      profile,
      resumeScore: {
        score: latest?.overallScore ?? 0,
        ats: latest?.atsScore ?? 0,
        updatedAt: latest?.createdAt ?? new Date().toISOString(),
      },
      insights,
      recommendedJobs: this.recommendJobs(jobs, profile).slice(0, 4),
      savedJobs: jobs.filter((job) => job.saved),
      applications,
      interviews: interviews.filter((interview) => interview.status === "scheduled"),
      notifications,
    };
  }


  /* ---------------------------- Recommended jobs --------------------------- */

  /**
   * Deterministic matching: candidate skills, preferred roles, preferred
   * locations, work mode and salary expectation. No external AI.
   */
  private recommendJobs(jobs: Job[], profile: CandidateProfile): Job[] {
    const roles = profile.preferences.desiredRoles.map((role) => role.toLowerCase());
    const locations = profile.preferences.locations.map((location) => location.toLowerCase());
    const workMode = profile.preferences.workMode;
    const minSalary = profile.preferences.minSalary;
    const applied = new Set<string>();

    const scored = jobs
      .filter((job) => !applied.has(job.id))
      .map((job) => {
        let score = job.matchScore;
        if (roles.some((role) => job.title.toLowerCase().includes(role))) score += 25;
        if (locations.some((location) => job.location.toLowerCase().includes(location))) {
          score += 15;
        }
        if (workMode === "remote" && job.remote) score += 10;
        if (minSalary && job.salaryMax >= minSalary) score += 10;
        if (profile.experience.length && job.experience !== "any") score += 5;
        return { job, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.map((entry) => ({
      ...entry.job,
      matchScore: Math.min(100, Math.round(entry.score)),
    }));
  }

  async getRecommendedJobs(): Promise<Job[]> {
    const [jobs, profile] = await Promise.all([this.getJobs(), this.getProfile()]);
    return this.recommendJobs(jobs, profile);
  }

  /* -------------------------------- Settings ------------------------------- */

  /**
   * Settings live in `candidate_settings`, one row per user. The row is created
   * on first read so the UI always has a persisted source of truth.
   */
  private async loadSettingsRow(userId: string): Promise<CandidateSettingsRow> {
    const existing = await this.single<CandidateSettingsRow>(
      this.table("candidate_settings").select("*").eq("user_id", userId).maybeSingle(),
    );
    if (existing) return existing;

    const seed = {
      user_id: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    const created = await this.single<CandidateSettingsRow>(
      this.table("candidate_settings")
        .upsert(seed, { onConflict: "user_id" })
        .select("*")
        .single(),
    );

    if (!created) this.fail("Failed to initialise candidate settings");
    return created as CandidateSettingsRow;
  }

  private mapSettings(row: CandidateSettingsRow, email: string, updatedAt: string) {
    return {
      account: {
        email,
        language: row.language,
        timezone: row.timezone,
      },
      security: {
        twoFactor: row.two_factor,
        lastPasswordChange: updatedAt,
      },
      preferences: {
        jobAlerts: row.job_alerts,
        weeklyDigest: row.weekly_digest,
        profileVisible: row.profile_visible,
      },
      notifications: {
        applicationUpdates: row.application_updates,
        interviewReminders: row.interview_reminders,
        newMatches: row.new_matches,
        productNews: row.product_news,
      },
      subscription: {
        plan: row.plan as CandidateSettings["subscription"]["plan"],
        renewsOn: row.renews_on,
        aiCreditsUsed: row.ai_credits_used,
        aiCredits: row.ai_credits,
      },
    } satisfies CandidateSettings;
  }

  async getSettings(): Promise<CandidateSettings> {
    const user = await this.getSessionUser();
    const row = await this.loadSettingsRow(user.id);
    return this.mapSettings(
      row,
      user.email ?? "",
      user.updated_at ?? user.created_at ?? new Date().toISOString(),
    );
  }

  async updateSettings(patch: Partial<CandidateSettings>): Promise<CandidateSettings> {
    const user = await this.getSessionUser();
    const current = await this.getSettings();
    const next: CandidateSettings = {
      ...current,
      ...patch,
      account: { ...current.account, ...patch.account },
      security: { ...current.security, ...patch.security },
      preferences: { ...current.preferences, ...patch.preferences },
      notifications: { ...current.notifications, ...patch.notifications },
      subscription: { ...current.subscription, ...patch.subscription },
    };

    const saved = await this.single<CandidateSettingsRow>(
      this.table("candidate_settings")
        .upsert(
          {
            user_id: user.id,
            language: next.account.language,
            timezone: next.account.timezone,
            two_factor: next.security.twoFactor,
            job_alerts: next.preferences.jobAlerts,
            weekly_digest: next.preferences.weeklyDigest,
            profile_visible: next.preferences.profileVisible,
            application_updates: next.notifications.applicationUpdates,
            interview_reminders: next.notifications.interviewReminders,
            new_matches: next.notifications.newMatches,
            product_news: next.notifications.productNews,
            plan: next.subscription.plan,
            renews_on: next.subscription.renewsOn,
            ai_credits_used: next.subscription.aiCreditsUsed,
            ai_credits: next.subscription.aiCredits,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single(),
    );

    if (!saved) this.fail("Failed to save candidate settings");

    return this.mapSettings(
      saved as CandidateSettingsRow,
      next.account.email,
      user.updated_at ?? new Date().toISOString(),
    );
  }


  /* ------------------------------- Onboarding ------------------------------ */

  async getOnboardingState(): Promise<OnboardingState> {
    const userId = await this.getCurrentUserId();
    const row = await this.single<OnboardingRow>(
      this.table("onboarding_progress").select("*").eq("user_id", userId).maybeSingle(),
    );

    if (!row) {
      return { currentStep: "welcome", completedSteps: [], data: {} };
    }

    return {
      currentStep: (row.current_step ?? "welcome") as OnboardingStepId,
      completedSteps: (row.completed_steps ?? []) as OnboardingStepId[],
      data: row.onboarding_data ?? {},
    };
  }

  async saveOnboardingState(state: OnboardingState): Promise<OnboardingState> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.table("onboarding_progress").upsert(
      {
        user_id: userId,
        current_step: state.currentStep,
        completed_steps: state.completedSteps,
        onboarding_data: state.data,
        completed: state.currentStep === "complete",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) this.fail(error.message);

    return state;
  }

  async resetOnboarding(): Promise<OnboardingState> {
    const fresh: OnboardingState = { currentStep: "welcome", completedSteps: [], data: {} };
    return this.saveOnboardingState(fresh);
  }

  /* ------------------------- Interview preparation ------------------------- */

  /**
   * Preparation questions are derived from the candidate's own skills and
   * upcoming interviews; practice progress is persisted per user in
   * `interview_prep_progress`.
   */
  async getPrepOverview(): Promise<PrepOverview> {
    const userId = await this.getCurrentUserId();
    const [skills, interviews, practiced] = await Promise.all([
      this.rows<SkillRow>(this.table("skills").select("*").eq("user_id", userId)),
      this.getInterviews(),
      this.readPracticed(userId),
    ]);

    const questions = skills.slice(0, 12).map((skill, index) => ({
      id: `prep-${skill.id}`,
      category: (index % 3 === 0 ? "behavioral" : "technical") as "technical" | "behavioral",
      question:
        index % 3 === 0
          ? `Tell me about a project where ${skill.skill_name} made the difference.`
          : `How would you solve a production problem using ${skill.skill_name}?`,
      topic: skill.category ?? skill.skill_name,
      difficulty: (skill.proficiency_level === "expert"
        ? "hard"
        : skill.proficiency_level === "beginner"
          ? "easy"
          : "medium") as "easy" | "medium" | "hard",
      practiced: practiced.has(`prep-${skill.id}`),
    }));

    const practicedCount = questions.filter((question) => question.practiced).length;

    return {
      questions,
      suggestedTopics: interviews.slice(0, 3).map((interview) => ({
        topic: interview.round,
        reason: `${interview.company} — ${new Date(interview.scheduledAt).toLocaleDateString()}`,
      })),
      progress: {
        practiced: practicedCount,
        total: questions.length,
        readiness: percentage(practicedCount, Math.max(1, questions.length)),
      },
    };
  }

  private async readPracticed(userId: string): Promise<Set<string>> {
    const rows = await this.rows<PrepProgressRow>(
      this.table("interview_prep_progress")
        .select("question_id, practiced")
        .eq("user_id", userId)
        .eq("practiced", true),
    );
    return new Set(rows.map((row) => row.question_id));
  }

  async togglePracticed(questionId: string): Promise<PrepOverview> {
    const userId = await this.getCurrentUserId();
    const practiced = await this.readPracticed(userId);

    const { error } = await this.table("interview_prep_progress").upsert(
      {
        user_id: userId,
        question_id: questionId,
        practiced: !practiced.has(questionId),
      },
      { onConflict: "user_id,question_id" },
    );
    if (error) this.fail(error.message);

    return this.getPrepOverview();

  }
}
