/**
 * Local (no external AI) scoring helpers for recruiter applicant ranking.
 *
 * Everything here is a pure function over data already stored in Supabase:
 * candidate skills, experience, education and resume analyses. Used by the
 * Supabase hiring repository to build `Applicant.ai` and AI workspace
 * rankings without calling any external model.
 */

export interface SkillMatch {
  matchedSkills: string[];
  missingSkills: string[];
  skillScore: number;
}

const DEGREE_RANK: { keyword: string; label: string; rank: number }[] = [
  { keyword: "phd", label: "PhD", rank: 5 },
  { keyword: "doctor", label: "Doctorate", rank: 5 },
  { keyword: "master", label: "Master's", rank: 4 },
  { keyword: "mba", label: "MBA", rank: 4 },
  { keyword: "m.tech", label: "M.Tech", rank: 4 },
  { keyword: "msc", label: "M.Sc", rank: 4 },
  { keyword: "bachelor", label: "Bachelor's", rank: 3 },
  { keyword: "b.tech", label: "B.Tech", rank: 3 },
  { keyword: "bsc", label: "B.Sc", rank: 3 },
  { keyword: "be", label: "Bachelor's", rank: 3 },
  { keyword: "diploma", label: "Diploma", rank: 2 },
  { keyword: "high school", label: "High school", rank: 1 },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Compares required job skills against the candidate's stored skills. */
export function matchSkills(jobSkills: string[], candidateSkills: string[]): SkillMatch {
  const owned = new Set(candidateSkills.map(normalize));
  const required = jobSkills.filter((skill) => skill.trim().length > 0);

  const matchedSkills = required.filter((skill) => owned.has(normalize(skill)));
  const missingSkills = required.filter((skill) => !owned.has(normalize(skill)));

  const skillScore = required.length
    ? Math.round((matchedSkills.length / required.length) * 100)
    : candidateSkills.length
      ? 60
      : 0;

  return { matchedSkills, missingSkills, skillScore };
}

/** Total years of professional experience from experience rows. */
export function totalExperienceYears(
  rows: { start_date: string | null; end_date: string | null; currently_working: boolean }[],
): number {
  let months = 0;

  for (const row of rows) {
    const start = parseLooseDate(row.start_date);
    if (!start) continue;
    const end = row.currently_working ? new Date() : parseLooseDate(row.end_date) ?? new Date();
    const diff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) months += diff;
  }

  return Math.round((months / 12) * 10) / 10;
}

function parseLooseDate(value: string | null): Date | null {
  if (!value) return null;
  const iso = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Highest education level from education rows, e.g. "Master's". */
export function highestEducationLevel(rows: { degree: string | null }[]): string {
  let best: { label: string; rank: number } | null = null;

  for (const row of rows) {
    const degree = normalize(row.degree ?? "");
    if (!degree) continue;
    const hit = DEGREE_RANK.find((entry) => degree.includes(entry.keyword));
    const candidate = hit ? { label: hit.label, rank: hit.rank } : { label: row.degree!, rank: 0 };
    if (!best || candidate.rank > best.rank) best = candidate;
  }

  return best?.label ?? "Not specified";
}

/**
 * Blended fit score: skill overlap (60%), resume quality (25%) and
 * experience depth (15%).
 */
export function fitScore(input: {
  skillScore: number;
  resumeScore: number;
  experienceYears: number;
}): number {
  const experienceScore = clamp((input.experienceYears / 8) * 100);
  const resumeScore = input.resumeScore > 0 ? input.resumeScore : 55;
  return Math.round(
    clamp(input.skillScore * 0.6 + resumeScore * 0.25 + experienceScore * 0.15),
  );
}

/** Human-readable recommendation derived from the computed score. */
export function recommendationFor(score: number, missingSkills: string[]): string {
  if (score >= 85) return "Strong fit — move to interview.";
  if (score >= 70) {
    return missingSkills.length
      ? `Good fit — probe ${missingSkills.slice(0, 2).join(" and ")} during screening.`
      : "Good fit — worth a screening call.";
  }
  if (score >= 50) return "Partial fit — review resume before advancing.";
  return "Weak fit against the required skills.";
}

/** Fallback strengths/weaknesses when no resume analysis exists yet. */
export function derivedStrengths(matchedSkills: string[], experienceYears: number): string[] {
  const items: string[] = [];
  if (matchedSkills.length) items.push(`Matches ${matchedSkills.length} required skills`);
  if (experienceYears >= 1) items.push(`${experienceYears} years of experience`);
  return items;
}

export function derivedWeaknesses(missingSkills: string[], hasResume: boolean): string[] {
  const items: string[] = [];
  if (missingSkills.length) items.push(`Missing ${missingSkills.slice(0, 3).join(", ")}`);
  if (!hasResume) items.push("No resume analysis on file");
  return items;
}
