/**
 * Shared domain types for the CareerOS production AI engine.
 *
 * Every score produced by the engine ships with a {@link ScoreExplanation} so
 * the UI can always answer "why is this number what it is, and how do I move
 * it?" without a second model call.
 */

export type Priority = "high" | "medium" | "low";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Reasoning attached to every AI-produced score. */
export interface ScoreExplanation {
  /** Why the score landed where it did. */
  why: string;
  /** Which signals were weighed, and how. */
  howCalculated: string;
  /** The highest-leverage way to raise it. */
  howToImprove: string;
}

/** Provenance shared by every cached analysis payload. */
export interface AnalysisMeta {
  generatedAt: string;
  modelVersion: string;
  /** True when the payload was served from the Supabase cache. */
  cached: boolean;
}

/* ------------------------------- Job matching ------------------------------ */

export interface DimensionMatch {
  score: number;
  summary: string;
}

export interface JobMatchAnalysis {
  jobId: string;
  jobTitle: string;
  matchScore: number;
  verdict: "strong" | "good" | "fair" | "weak";
  matchingSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  experienceMatch: DimensionMatch;
  educationMatch: DimensionMatch;
  locationMatch: DimensionMatch;
  projectEvidence: string[];
  strengths: string[];
  gaps: string[];
  recommendation: string;
  explanation: ScoreExplanation;
  meta: AnalysisMeta;
}

/* ------------------------------- Skill gap -------------------------------- */

export interface LearningResource {
  title: string;
  provider: string;
  url?: string;
}

export interface RoadmapStep {
  order: number;
  title: string;
  skill: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  resources: LearningResource[];
}

export interface MissingSkill {
  name: string;
  priority: Priority;
  difficulty: Difficulty;
  estimatedHours: number;
  demand: number;
  why: string;
}

export interface SkillGapAnalysis {
  targetRole: string;
  matchScore: number;
  strongSkills: string[];
  missingSkills: MissingSkill[];
  recommendedTechnologies: { name: string; reason: string }[];
  roadmap: RoadmapStep[];
  totalLearningHours: number;
  explanation: ScoreExplanation;
  meta: AnalysisMeta;
}

/* -------------------------- Career recommendations ------------------------- */

export interface RecommendedJob {
  jobId: string | null;
  title: string;
  company: string;
  matchScore: number;
  reason: string;
}

export interface CareerPath {
  title: string;
  horizon: string;
  steps: string[];
  rationale: string;
}

export interface SalaryInsight {
  role: string;
  currency: string;
  min: number;
  median: number;
  max: number;
  basis: string;
}

export interface TechnologyPhase {
  phase: string;
  technologies: string[];
  outcome: string;
}

export interface CareerRecommendations {
  headline: string;
  recommendedJobs: RecommendedJob[];
  careerPaths: CareerPath[];
  roleSuggestions: { title: string; readiness: number; why: string }[];
  salaryInsights: SalaryInsight[];
  technologyRoadmap: TechnologyPhase[];
  explanation: ScoreExplanation;
  meta: AnalysisMeta;
}

/* ------------------------------ Recruiter AI ------------------------------- */

export interface RedFlag {
  severity: Priority;
  title: string;
  detail: string;
}

export interface InterviewQuestion {
  question: string;
  focus: string;
  lookFor: string;
}

export interface TechnicalAssessment {
  title: string;
  description: string;
  skills: string[];
  durationMinutes: number;
}

export interface ApplicantReview {
  applicantId: string;
  resumeSummary: string;
  rankingScore: number;
  strengths: string[];
  weaknesses: string[];
  redFlags: RedFlag[];
  recommendation: { decision: "advance" | "hold" | "reject"; rationale: string };
  cultureFitNotes: string[];
  interviewQuestions: InterviewQuestion[];
  technicalAssessments: TechnicalAssessment[];
  explanation: ScoreExplanation;
  meta: AnalysisMeta;
}
