/**
 * Server-only orchestration layer for the CareerOS AI engine.
 *
 * Responsibilities:
 *  - assemble real Supabase context (profile, skills, experience, education,
 *    projects, resume text, jobs) into deterministic prompt documents,
 *  - fingerprint that context so identical inputs never pay for a second
 *    generation (`ai_analyses` cache keyed by user + kind + subject),
 *  - run the four production engines (job match, skill gap, career
 *    recommendations, recruiter applicant review),
 *  - normalise model output into the strict types in `@/types/career-ai`.
 *
 * There are no fixtures or fallback payloads here: when the model cannot
 * produce usable output the caller receives an {@link AiEngineError}.
 */

import { AiEngineError, generateAiJson } from "@/lib/ai-json.server";
import { extractResumeText } from "@/lib/resume-text-extraction.server";
import type {
  ApplicantReview,
  CareerRecommendations,
  Difficulty,
  JobMatchAnalysis,
  Priority,
  ScoreExplanation,
  SkillGapAnalysis,
} from "@/types/career-ai";

/** Bumped whenever prompts or normalisation change, invalidating the cache. */
export const CAREER_AI_MODEL_VERSION = "careeros-ai@1:openai/gpt-5.6-sol";

/** Cache partitions inside `public.ai_analyses`. */
export type AnalysisKind =
  | "job-match"
  | "skill-gap"
  | "career-recommendations"
  | "applicant-review";

type Row = Record<string, unknown>;

/* ------------------------------ Infrastructure ----------------------------- */

interface LooseAdmin {
  from: (table: string) => any;
  storage: { from: (bucket: string) => any };
}

async function getAdmin(): Promise<LooseAdmin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as LooseAdmin;
}

/** SHA-256 fingerprint of the exact context handed to the model. */
export async function fingerprint(...parts: unknown[]): Promise<string> {
  const source = parts
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part ?? null)))
    .join("\u0000");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

interface CacheKey {
  userId: string;
  kind: AnalysisKind;
  subjectId: string;
  inputHash: string;
}

/** Returns the cached payload when the fingerprint and model version match. */
async function readCache<T>(key: CacheKey): Promise<T | null> {
  try {
    const admin = await getAdmin();
    const { data } = await admin
      .from("ai_analyses")
      .select("payload, input_hash, model_version, updated_at")
      .eq("user_id", key.userId)
      .eq("kind", key.kind)
      .eq("subject_id", key.subjectId)
      .maybeSingle();

    if (!data) return null;
    if (data.input_hash !== key.inputHash) return null;
    if (data.model_version !== CAREER_AI_MODEL_VERSION) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

/** Upserts a freshly generated payload. Cache failures never fail the request. */
async function writeCache(key: CacheKey, payload: unknown): Promise<void> {
  try {
    const admin = await getAdmin();
    await admin.from("ai_analyses").upsert(
      {
        user_id: key.userId,
        kind: key.kind,
        subject_id: key.subjectId,
        input_hash: key.inputHash,
        payload,
        model_version: CAREER_AI_MODEL_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kind,subject_id" },
    );
  } catch {
    /* cache is best-effort */
  }
}

/** Runs `generate` unless a matching cached payload exists. */
async function withCache<T extends { meta: { cached: boolean; generatedAt: string; modelVersion: string } }>(
  key: CacheKey,
  force: boolean,
  generate: () => Promise<Omit<T, "meta">>,
): Promise<T> {
  if (!force) {
    const cached = await readCache<T>(key);
    if (cached) return { ...cached, meta: { ...cached.meta, cached: true } };
  }

  const generated = await generate();
  const payload = {
    ...generated,
    meta: {
      generatedAt: new Date().toISOString(),
      modelVersion: CAREER_AI_MODEL_VERSION,
      cached: false,
    },
  } as T;

  await writeCache(key, payload);
  return payload;
}

/* -------------------------------- Normalisers ------------------------------ */

function clampScore(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function positiveNumber(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function stringList(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, limit);
}

function objectList(value: unknown, limit = 12): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Row => typeof item === "object" && item !== null).slice(0, limit);
}

function priority(value: unknown): Priority {
  const raw = String(value ?? "").toLowerCase();
  return raw === "high" || raw === "low" ? raw : "medium";
}

function difficulty(value: unknown): Difficulty {
  const raw = String(value ?? "").toLowerCase();
  return raw === "beginner" || raw === "advanced" ? raw : "intermediate";
}

function explanation(value: unknown): ScoreExplanation {
  const row = (typeof value === "object" && value !== null ? value : {}) as Row;
  const why = text(row["why"]);
  const howCalculated = text(row["howCalculated"]);
  const howToImprove = text(row["howToImprove"]);
  if (!why || !howCalculated || !howToImprove) {
    throw new AiEngineError(
      "The AI response was missing its score explanation.",
      "INVALID_OUTPUT",
      true,
      502,
    );
  }
  return { why, howCalculated, howToImprove };
}

function requireObject(value: unknown): Row {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AiEngineError("The AI response had an unexpected shape.", "INVALID_OUTPUT", true, 502);
  }
  return value as Row;
}

/* ------------------------------ Candidate context -------------------------- */

export interface CandidateContext {
  userId: string;
  profile: Row | null;
  preferences: Row | null;
  skills: Row[];
  experience: Row[];
  education: Row[];
  projects: Row[];
  resume: { id: string | null; text: string; source: "file" | "profile" | "none" };
  /** Human-readable dossier handed to the model. */
  document: string;
  /** Deterministic snapshot used for cache fingerprinting. */
  snapshot: string;
}

function formatPeriod(row: Row): string {
  const start = row["start_date"] ? String(row["start_date"]).slice(0, 10) : "?";
  const end = row["currently_working"]
    ? "Present"
    : row["end_date"]
      ? String(row["end_date"]).slice(0, 10)
      : "?";
  return `${start} → ${end}`;
}

function renderCandidate(context: Omit<CandidateContext, "document" | "snapshot">): string {
  const { profile, preferences, skills, experience, education, projects, resume } = context;
  const lines: string[] = [];

  lines.push("## CANDIDATE PROFILE");
  if (profile) {
    lines.push(`Name: ${text(profile["full_name"], "Unknown")}`);
    if (profile["headline"]) lines.push(`Headline: ${String(profile["headline"])}`);
    if (profile["location"]) lines.push(`Location: ${String(profile["location"])}`);
    if (profile["bio"]) lines.push(`Bio: ${String(profile["bio"])}`);
    const links = ["linkedin_url", "github_url", "portfolio_url", "website_url"]
      .map((key) => profile[key])
      .filter(Boolean)
      .join(" | ");
    if (links) lines.push(`Links: ${links}`);
  } else {
    lines.push("No profile row on file.");
  }

  if (preferences) {
    lines.push("\n## PREFERENCES");
    lines.push(`Desired roles: ${stringList(preferences["desired_roles"], 20).join(", ") || "—"}`);
    lines.push(`Locations: ${stringList(preferences["locations"], 20).join(", ") || "—"}`);
    lines.push(`Work mode: ${text(preferences["work_mode"], "—")}`);
    lines.push(`Minimum salary: ${String(preferences["min_salary"] ?? "—")}`);
    lines.push(`Open to relocate: ${preferences["open_to_relocate"] ? "yes" : "no"}`);
    if (preferences["notice_period"]) lines.push(`Notice period: ${String(preferences["notice_period"])}`);
  }

  lines.push("\n## SKILLS");
  lines.push(
    skills.length
      ? skills
          .map(
            (row) =>
              `${String(row["skill_name"])} (${String(row["proficiency_level"] ?? "unspecified")}${
                row["years_of_experience"] ? `, ${String(row["years_of_experience"])}y` : ""
              })`,
          )
          .join(", ")
      : "None recorded.",
  );

  lines.push("\n## EXPERIENCE");
  if (experience.length === 0) lines.push("None recorded.");
  for (const row of experience) {
    lines.push(
      `- ${String(row["job_title"])} @ ${String(row["company_name"])} (${formatPeriod(row)})${
        row["location"] ? ` — ${String(row["location"])}` : ""
      }`,
    );
    if (row["description"]) lines.push(`  ${String(row["description"])}`);
  }

  lines.push("\n## EDUCATION");
  if (education.length === 0) lines.push("None recorded.");
  for (const row of education) {
    lines.push(
      `- ${String(row["degree"])}${row["field_of_study"] ? ` in ${String(row["field_of_study"])}` : ""} — ${String(
        row["institution"],
      )} (${formatPeriod(row)})${row["grade"] ? `, grade ${String(row["grade"])}` : ""}`,
    );
  }

  lines.push("\n## PROJECTS");
  if (projects.length === 0) lines.push("None recorded.");
  for (const row of projects) {
    const tech = Array.isArray(row["technologies"]) ? (row["technologies"] as string[]).join(", ") : "";
    lines.push(`- ${String(row["title"])}${tech ? ` [${tech}]` : ""}`);
    if (row["description"]) lines.push(`  ${String(row["description"])}`);
  }

  if (resume.text) {
    lines.push(`\n## RESUME TEXT (source: ${resume.source})`);
    lines.push(resume.text.slice(0, 18_000));
  }

  return lines.join("\n");
}

/** Loads every candidate signal the engines reason about. */
export async function loadCandidateContext(
  userId: string,
  resumeId?: string | null,
): Promise<CandidateContext> {
  const admin = await getAdmin();

  const list = async (table: string, columns: string, order?: string): Promise<Row[]> => {
    let query = admin.from(table).select(columns).eq("user_id", userId);
    if (order) query = query.order(order, { ascending: false });
    const { data } = await query;
    return (data ?? []) as Row[];
  };

  const [profiles, preferences, skills, experience, education, projects, resumes] = await Promise.all([
    list("candidate_profiles", "full_name, headline, bio, location, linkedin_url, github_url, portfolio_url, website_url"),
    list("candidate_preferences", "desired_roles, locations, work_mode, min_salary, open_to_relocate, notice_period"),
    list("skills", "skill_name, proficiency_level, years_of_experience, category"),
    list(
      "experience",
      "job_title, company_name, employment_type, location, start_date, end_date, currently_working, description",
      "start_date",
    ),
    list("education", "institution, degree, field_of_study, start_date, end_date, grade", "start_date"),
    list("projects", "title, description, technologies, github_url, live_url", "created_at"),
    list("resumes", "id, is_active, updated_at", "updated_at"),
  ]);

  const chosenResume =
    (resumeId ? resumes.find((row) => row["id"] === resumeId) : undefined) ??
    resumes.find((row) => row["is_active"] === true) ??
    resumes[0];

  let resume: CandidateContext["resume"] = { id: null, text: "", source: "none" };
  if (chosenResume?.["id"]) {
    const extracted = await extractResumeText(String(chosenResume["id"]), userId);
    resume = { id: String(chosenResume["id"]), text: extracted.text, source: extracted.source };
  }

  const base = {
    userId,
    profile: profiles[0] ?? null,
    preferences: preferences[0] ?? null,
    skills,
    experience,
    education,
    projects,
    resume,
  };

  const document = renderCandidate(base);
  const snapshot = JSON.stringify({
    profile: base.profile,
    preferences: base.preferences,
    skills,
    experience,
    education,
    projects,
    resumeId: resume.id,
    resumeLength: resume.text.length,
  });

  return { ...base, document, snapshot };
}

/** True when there is not enough candidate data to reason about. */
export function isCandidateContextEmpty(context: CandidateContext): boolean {
  return (
    !context.profile &&
    context.skills.length === 0 &&
    context.experience.length === 0 &&
    context.education.length === 0 &&
    context.projects.length === 0 &&
    context.resume.text.length === 0
  );
}

/* --------------------------------- Job context ----------------------------- */

const JOB_COLUMNS =
  "id, title, description, requirements, responsibilities, benefits, skills, location, workplace_type, employment_type, experience_level, min_experience, max_experience, min_salary, max_salary, currency, company_name, department, status";

function renderJob(job: Row): string {
  const lines = [
    "## JOB",
    `Title: ${String(job["title"])}`,
    `Company: ${text(job["company_name"], "Undisclosed")}`,
    `Location: ${text(job["location"], "—")} (${text(job["workplace_type"], "unspecified")})`,
    `Employment type: ${text(job["employment_type"], "—")}`,
    `Experience level: ${text(job["experience_level"], "—")} (${String(job["min_experience"] ?? "?")}–${String(
      job["max_experience"] ?? "?",
    )} years)`,
    `Salary: ${String(job["min_salary"] ?? "?")}–${String(job["max_salary"] ?? "?")} ${text(job["currency"], "")}`.trim(),
    `Required skills: ${stringList(job["skills"], 40).join(", ") || "—"}`,
    `\nDescription:\n${text(job["description"], "—")}`,
  ];
  if (job["requirements"]) lines.push(`\nRequirements:\n${String(job["requirements"])}`);
  if (job["responsibilities"]) lines.push(`\nResponsibilities:\n${String(job["responsibilities"])}`);
  if (job["benefits"]) lines.push(`\nBenefits:\n${String(job["benefits"])}`);
  return lines.join("\n");
}

async function loadJob(jobId: string): Promise<Row> {
  const admin = await getAdmin();
  const { data } = await admin.from("jobs").select(JOB_COLUMNS).eq("id", jobId).maybeSingle();
  if (!data) {
    throw new AiEngineError("That job could not be found.", "INTERNAL_ERROR", false, 404);
  }
  return data as Row;
}

/** Loads a shortlist of open jobs used to ground career recommendations. */
async function loadOpenJobs(limit = 25): Promise<Row[]> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("jobs")
    .select("id, title, company_name, location, workplace_type, experience_level, skills, min_salary, max_salary, currency")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Row[];
}

function renderJobShortlist(jobs: Row[]): string {
  if (jobs.length === 0) return "No open jobs are currently posted on the platform.";
  return jobs
    .map(
      (job) =>
        `- id=${String(job["id"])} | ${String(job["title"])} @ ${text(job["company_name"], "Undisclosed")} | ${text(
          job["location"],
          "—",
        )} | ${text(job["experience_level"], "—")} | skills: ${stringList(job["skills"], 15).join(", ") || "—"}`,
    )
    .join("\n");
}

/* ---------------------------------- Prompts -------------------------------- */

const BASE_RULES = `You are the CareerOS analysis engine.
Rules:
- Reason only from the supplied candidate and job data. Never invent employers, degrees, or skills.
- Every score is an integer 0-100 and must be justified by the evidence you cite.
- Always include an "explanation" object with "why", "howCalculated" and "howToImprove".
- Respond with a single JSON object and nothing else: no prose, no markdown fences.`;

/* -------------------------------- Job matching ----------------------------- */

export interface EngineOptions {
  runId?: string | undefined;
  force?: boolean;
}

/** Scores a candidate against a specific job posting. */
export async function runJobMatch(
  userId: string,
  jobId: string,
  options: EngineOptions = {},
): Promise<JobMatchAnalysis> {
  const [context, job] = await Promise.all([loadCandidateContext(userId), loadJob(jobId)]);

  if (isCandidateContextEmpty(context)) {
    throw new AiEngineError(
      "Add your skills, experience or a resume before running a match.",
      "INVALID_OUTPUT",
      false,
      422,
    );
  }

  const inputHash = await fingerprint(context.snapshot, job, CAREER_AI_MODEL_VERSION);

  return withCache<JobMatchAnalysis>(
    { userId, kind: "job-match", subjectId: jobId, inputHash },
    options.force ?? false,
    async () => {
      const raw = await generateAiJson<Row>({
        runId: options.runId,
        system: `${BASE_RULES}
Return this exact shape:
{"matchScore":number,"verdict":"strong"|"good"|"fair"|"weak","matchingSkills":string[],"missingSkills":string[],"transferableSkills":string[],"experienceMatch":{"score":number,"summary":string},"educationMatch":{"score":number,"summary":string},"locationMatch":{"score":number,"summary":string},"projectEvidence":string[],"strengths":string[],"gaps":string[],"recommendation":string,"explanation":{"why":string,"howCalculated":string,"howToImprove":string}}
Weight skills 45%, experience 30%, education 10%, location/logistics 15%, and say so in howCalculated.`,
        prompt: `${context.document}\n\n${renderJob(job)}\n\nAnalyse this candidate against this job.`,
      });

      const dimension = (value: unknown) => {
        const row = requireObject(value ?? {});
        return { score: clampScore(row["score"]), summary: text(row["summary"], "Not enough data.") };
      };

      const matchScore = clampScore(raw["matchScore"]);
      const verdictRaw = String(raw["verdict"] ?? "").toLowerCase();
      const verdict = (["strong", "good", "fair", "weak"] as const).includes(verdictRaw as never)
        ? (verdictRaw as JobMatchAnalysis["verdict"])
        : matchScore >= 80
          ? "strong"
          : matchScore >= 65
            ? "good"
            : matchScore >= 45
              ? "fair"
              : "weak";

      return {
        jobId,
        jobTitle: String(job["title"]),
        matchScore,
        verdict,
        matchingSkills: stringList(raw["matchingSkills"], 20),
        missingSkills: stringList(raw["missingSkills"], 20),
        transferableSkills: stringList(raw["transferableSkills"], 20),
        experienceMatch: dimension(raw["experienceMatch"]),
        educationMatch: dimension(raw["educationMatch"]),
        locationMatch: dimension(raw["locationMatch"]),
        projectEvidence: stringList(raw["projectEvidence"], 10),
        strengths: stringList(raw["strengths"], 10),
        gaps: stringList(raw["gaps"], 10),
        recommendation: text(raw["recommendation"], "Review the gaps listed above before applying."),
        explanation: explanation(raw["explanation"]),
      };
    },
  );
}

/* --------------------------------- Skill gap -------------------------------- */

/** Builds a learning roadmap between the candidate and a target role. */
export async function runSkillGap(
  userId: string,
  targetRole: string,
  options: EngineOptions & { jobId?: string | null } = {},
): Promise<SkillGapAnalysis> {
  const context = await loadCandidateContext(userId);

  if (isCandidateContextEmpty(context)) {
    throw new AiEngineError(
      "Add your skills or a resume before running a skill gap analysis.",
      "INVALID_OUTPUT",
      false,
      422,
    );
  }

  const job = options.jobId ? await loadJob(options.jobId) : null;
  const role = text(targetRole) || stringList(context.preferences?.["desired_roles"], 1)[0] || "";
  if (!role) {
    throw new AiEngineError(
      "Choose a target role to analyse.",
      "INVALID_OUTPUT",
      false,
      422,
    );
  }

  const subjectId = options.jobId ? `job:${options.jobId}` : `role:${role.toLowerCase()}`;
  const inputHash = await fingerprint(context.snapshot, role, job, CAREER_AI_MODEL_VERSION);

  return withCache<SkillGapAnalysis>(
    { userId, kind: "skill-gap", subjectId, inputHash },
    options.force ?? false,
    async () => {
      const raw = await generateAiJson<Row>({
        runId: options.runId,
        system: `${BASE_RULES}
Return this exact shape:
{"matchScore":number,"strongSkills":string[],"missingSkills":[{"name":string,"priority":"high"|"medium"|"low","difficulty":"beginner"|"intermediate"|"advanced","estimatedHours":number,"demand":number,"why":string}],"recommendedTechnologies":[{"name":string,"reason":string}],"roadmap":[{"order":number,"title":string,"skill":string,"description":string,"difficulty":"beginner"|"intermediate"|"advanced","estimatedHours":number,"resources":[{"title":string,"provider":string,"url":string}]}],"explanation":{"why":string,"howCalculated":string,"howToImprove":string}}
Order the roadmap so high-priority, high-leverage skills come first. "demand" is market demand 0-100. Suggest 4-8 roadmap steps and only real, well-known learning providers.`,
        prompt: `${context.document}\n\nTARGET ROLE: ${role}${job ? `\n\n${renderJob(job)}` : ""}\n\nIdentify the gap between this candidate and the target role, then build the roadmap.`,
      });

      const missingSkills = objectList(raw["missingSkills"], 15).map((row) => ({
        name: text(row["name"], "Unnamed skill"),
        priority: priority(row["priority"]),
        difficulty: difficulty(row["difficulty"]),
        estimatedHours: positiveNumber(row["estimatedHours"], 20),
        demand: clampScore(row["demand"], 50),
        why: text(row["why"], "Required by the target role."),
      }));

      const roadmap = objectList(raw["roadmap"], 12).map((row, index) => ({
        order: positiveNumber(row["order"], index + 1) || index + 1,
        title: text(row["title"], `Step ${index + 1}`),
        skill: text(row["skill"], missingSkills[index]?.name ?? role),
        description: text(row["description"], ""),
        difficulty: difficulty(row["difficulty"]),
        estimatedHours: positiveNumber(row["estimatedHours"], 20),
        resources: objectList(row["resources"], 4).map((resource) => {
          const url = text(resource["url"]);
          return {
            title: text(resource["title"], "Learning resource"),
            provider: text(resource["provider"], "—"),
            ...(url ? { url } : {}),
          };
        }),
      }));

      if (roadmap.length === 0) {
        throw new AiEngineError(
          "The AI could not build a roadmap for that role.",
          "INVALID_OUTPUT",
          true,
          502,
        );
      }

      return {
        targetRole: role,
        matchScore: clampScore(raw["matchScore"]),
        strongSkills: stringList(raw["strongSkills"], 20),
        missingSkills,
        recommendedTechnologies: objectList(raw["recommendedTechnologies"], 10).map((row) => ({
          name: text(row["name"], "—"),
          reason: text(row["reason"], ""),
        })),
        roadmap: roadmap.sort((a, b) => a.order - b.order),
        totalLearningHours: roadmap.reduce((sum, step) => sum + step.estimatedHours, 0),
        explanation: explanation(raw["explanation"]),
      };
    },
  );
}

/* --------------------------- Career recommendations ------------------------- */

/** Produces job, path, salary and technology guidance for a candidate. */
export async function runCareerRecommendations(
  userId: string,
  options: EngineOptions = {},
): Promise<CareerRecommendations> {
  const [context, jobs] = await Promise.all([loadCandidateContext(userId), loadOpenJobs()]);

  if (isCandidateContextEmpty(context)) {
    throw new AiEngineError(
      "Complete your profile before generating recommendations.",
      "INVALID_OUTPUT",
      false,
      422,
    );
  }

  const jobIds = new Set(jobs.map((job) => String(job["id"])));
  const inputHash = await fingerprint(
    context.snapshot,
    jobs.map((job) => job["id"]),
    CAREER_AI_MODEL_VERSION,
  );

  return withCache<CareerRecommendations>(
    { userId, kind: "career-recommendations", subjectId: "self", inputHash },
    options.force ?? false,
    async () => {
      const raw = await generateAiJson<Row>({
        runId: options.runId,
        system: `${BASE_RULES}
Return this exact shape:
{"headline":string,"recommendedJobs":[{"jobId":string|null,"title":string,"company":string,"matchScore":number,"reason":string}],"careerPaths":[{"title":string,"horizon":string,"steps":string[],"rationale":string}],"roleSuggestions":[{"title":string,"readiness":number,"why":string}],"salaryInsights":[{"role":string,"currency":string,"min":number,"median":number,"max":number,"basis":string}],"technologyRoadmap":[{"phase":string,"technologies":string[],"outcome":string}],"explanation":{"why":string,"howCalculated":string,"howToImprove":string}}
Only use jobId values that appear in the OPEN JOBS list; use null for aspirational roles that are not posted. Give 3-6 recommended jobs, 2-3 career paths, 3-5 role suggestions and 3 technology phases.`,
        prompt: `${context.document}\n\n## OPEN JOBS\n${renderJobShortlist(jobs)}\n\nRecommend the strongest next moves for this candidate.`,
      });

      const recommendedJobs = objectList(raw["recommendedJobs"], 8).map((row) => {
        const id = text(row["jobId"]);
        return {
          jobId: id && jobIds.has(id) ? id : null,
          title: text(row["title"], "Role"),
          company: text(row["company"], "—"),
          matchScore: clampScore(row["matchScore"]),
          reason: text(row["reason"], ""),
        };
      });

      return {
        headline: text(raw["headline"], "Your next career moves"),
        recommendedJobs,
        careerPaths: objectList(raw["careerPaths"], 5).map((row) => ({
          title: text(row["title"], "Career path"),
          horizon: text(row["horizon"], "12–24 months"),
          steps: stringList(row["steps"], 8),
          rationale: text(row["rationale"], ""),
        })),
        roleSuggestions: objectList(raw["roleSuggestions"], 8).map((row) => ({
          title: text(row["title"], "Role"),
          readiness: clampScore(row["readiness"]),
          why: text(row["why"], ""),
        })),
        salaryInsights: objectList(raw["salaryInsights"], 6).map((row) => ({
          role: text(row["role"], "Role"),
          currency: text(row["currency"], "USD"),
          min: positiveNumber(row["min"]),
          median: positiveNumber(row["median"]),
          max: positiveNumber(row["max"]),
          basis: text(row["basis"], "Market estimate"),
        })),
        technologyRoadmap: objectList(raw["technologyRoadmap"], 6).map((row) => ({
          phase: text(row["phase"], "Phase"),
          technologies: stringList(row["technologies"], 10),
          outcome: text(row["outcome"], ""),
        })),
        explanation: explanation(raw["explanation"]),
      };
    },
  );
}

/* ------------------------------ Recruiter review ---------------------------- */

/**
 * Reviews one applicant for the recruiter who owns the job.
 *
 * Ownership is verified against `recruiters.user_id` before any applicant data
 * is loaded, so a recruiter can only review their own pipeline.
 */
export async function runApplicantReview(
  recruiterUserId: string,
  applicationId: string,
  options: EngineOptions = {},
): Promise<ApplicantReview> {
  const admin = await getAdmin();

  const { data: application } = await admin
    .from("applications")
    .select("id, job_id, user_id, recruiter_id, resume_id, status, cover_letter, created_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    throw new AiEngineError("That application could not be found.", "INTERNAL_ERROR", false, 404);
  }

  const { data: recruiter } = await admin
    .from("recruiters")
    .select("id, user_id, company_name, hiring_roles, work_modes")
    .eq("user_id", recruiterUserId)
    .maybeSingle();

  const ownsPipeline =
    recruiter && application.recruiter_id ? recruiter.id === application.recruiter_id : false;

  if (!ownsPipeline) {
    const { data: job } = await admin
      .from("jobs")
      .select("recruiter_id")
      .eq("id", application.job_id)
      .maybeSingle();
    if (!recruiter || !job || job.recruiter_id !== recruiter.id) {
      throw new AiEngineError(
        "You do not have access to this applicant.",
        "INTERNAL_ERROR",
        false,
        403,
      );
    }
  }

  const applicantId = String(application.user_id);
  const [context, job] = await Promise.all([
    loadCandidateContext(applicantId, application.resume_id ?? null),
    loadJob(String(application.job_id)),
  ]);

  const coverLetter = text(application.cover_letter);
  const inputHash = await fingerprint(
    context.snapshot,
    job,
    coverLetter,
    application.status,
    CAREER_AI_MODEL_VERSION,
  );

  return withCache<ApplicantReview>(
    { userId: applicantId, kind: "applicant-review", subjectId: applicationId, inputHash },
    options.force ?? false,
    async () => {
      const raw = await generateAiJson<Row>({
        runId: options.runId,
        system: `${BASE_RULES}
You advise a recruiter reviewing one applicant. Be candid but fair, and never speculate about protected characteristics (age, gender, ethnicity, religion, health, family status).
Return this exact shape:
{"resumeSummary":string,"rankingScore":number,"strengths":string[],"weaknesses":string[],"redFlags":[{"severity":"high"|"medium"|"low","title":string,"detail":string}],"recommendation":{"decision":"advance"|"hold"|"reject","rationale":string},"cultureFitNotes":string[],"interviewQuestions":[{"question":string,"focus":string,"lookFor":string}],"technicalAssessments":[{"title":string,"description":string,"skills":string[],"durationMinutes":number}],"explanation":{"why":string,"howCalculated":string,"howToImprove":string}}
Provide 5-8 interview questions and 1-3 assessments. "redFlags" may be empty; only cite gaps evidenced by the data. In howToImprove, describe what would raise this applicant's ranking.`,
        prompt: `${context.document}${coverLetter ? `\n\n## COVER LETTER\n${coverLetter}` : ""}\n\n${renderJob(job)}\n\nCurrent pipeline status: ${String(
          application.status,
        )}\n\nReview this applicant for this role.`,
      });

      const decisionRaw = String(
        requireObject(raw["recommendation"] ?? {})["decision"] ?? "",
      ).toLowerCase();
      const rankingScore = clampScore(raw["rankingScore"]);

      return {
        applicantId,
        resumeSummary: text(raw["resumeSummary"], "No summary available."),
        rankingScore,
        strengths: stringList(raw["strengths"], 10),
        weaknesses: stringList(raw["weaknesses"], 10),
        redFlags: objectList(raw["redFlags"], 8).map((row) => ({
          severity: priority(row["severity"]),
          title: text(row["title"], "Concern"),
          detail: text(row["detail"], ""),
        })),
        recommendation: {
          decision: (["advance", "hold", "reject"] as const).includes(decisionRaw as never)
            ? (decisionRaw as ApplicantReview["recommendation"]["decision"])
            : rankingScore >= 70
              ? "advance"
              : rankingScore >= 45
                ? "hold"
                : "reject",
          rationale: text(
            requireObject(raw["recommendation"] ?? {})["rationale"],
            "See strengths and weaknesses above.",
          ),
        },
        cultureFitNotes: stringList(raw["cultureFitNotes"], 8),
        interviewQuestions: objectList(raw["interviewQuestions"], 10).map((row) => ({
          question: text(row["question"], ""),
          focus: text(row["focus"], "General"),
          lookFor: text(row["lookFor"], ""),
        })).filter((row) => row.question.length > 0),
        technicalAssessments: objectList(raw["technicalAssessments"], 4).map((row) => ({
          title: text(row["title"], "Assessment"),
          description: text(row["description"], ""),
          skills: stringList(row["skills"], 10),
          durationMinutes: positiveNumber(row["durationMinutes"], 60),
        })),
        explanation: explanation(raw["explanation"]),
      };
    },
  );
}
