/**
 * Resume Analysis domain types.
 * Shared by repositories, services, hooks, AI gateway and UI layers.
 *
 * Phase 4B.1 — type definitions only.
 * Do NOT import into other modules until subsequent phases.
 */

/* ================================ Enums / Literals ========================= */

/** Stages the analysis pipeline transitions through. */
export type ResumeAnalysisStage =
  | "idle"
  | "uploading"
  | "parsing"
  | "extracting"
  | "scoring"
  | "generating-feedback"
  | "done"
  | "error";

/** High-level category for a score breakdown item. */
export type ScoreCategory =
  | "formatting"
  | "content"
  | "keywords"
  | "ats-compatibility"
  | "impact"
  | "readability"
  | "relevance"
  | "grammar";

/** Severity of an individual issue found during analysis. */
export type IssueSeverity = "critical" | "warning" | "info";

/** Section of a resume that an issue or suggestion targets. */
export type ResumeSection =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "overall";

/** Format of the uploaded resume file. */
export type ResumeFormat = "pdf" | "docx" | "txt";

/** Status of an analysis run. */
export type AnalysisStatus = "pending" | "in-progress" | "completed" | "failed";

/* ============================== Core Interfaces ============================ */

/** Metadata about the uploaded resume file being analyzed. */
export interface ResumeFileMetadata {
  id: string;
  userId: string;
  fileName: string;
  format: ResumeFormat;
  sizeBytes: number;
  uploadedAt: string;
  checksum: string;
  version: number;
}

/** A single scored dimension within the analysis breakdown. */
export interface ScoreDimension {
  category: ScoreCategory;
  label: string;
  /** 0–100 */
  score: number;
  maxScore: number;
  summary: string;
  tips: string[];
}

/** A specific issue detected in the resume. */
export interface ResumeIssue {
  id: string;
  severity: IssueSeverity;
  section: ResumeSection;
  title: string;
  description: string;
  /** Optional line or position reference in the parsed content. */
  location?: string;
  suggestion?: string;
}

/** An actionable suggestion for improving the resume. */
export interface ResumeSuggestion {
  id: string;
  section: ResumeSection;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  /** Example of improved text, if applicable. */
  example?: string;
  /** Estimated score impact if applied. */
  estimatedImpact?: number;
}

/** Keyword analysis comparing resume content against target role/job. */
export interface KeywordAnalysis {
  /** Keywords found in both resume and target. */
  matched: string[];
  /** Keywords expected but missing from the resume. */
  missing: string[];
  /** Keywords in resume not relevant to target. */
  irrelevant: string[];
  /** Overall keyword density score 0–100. */
  densityScore: number;
}

/** ATS (Applicant Tracking System) compatibility details. */
export interface AtsCompatibility {
  /** 0–100 overall ATS score. */
  score: number;
  parseable: boolean;
  issues: string[];
  formatWarnings: string[];
  /** Whether standard section headings are detected. */
  standardSections: boolean;
  /** Whether contact info is machine-readable. */
  contactParseable: boolean;
}

/** Extracted structured data from the resume text. */
export interface ParsedResumeData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  experienceYears: number | null;
  educationEntries: ParsedEducation[];
  experienceEntries: ParsedExperience[];
  certifications: string[];
  links: string[];
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  field: string;
  year: string | null;
}

export interface ParsedExperience {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  bullets: string[];
}

/* ========================== Analysis Result Types ========================== */

/** Complete result of a resume analysis run. */
export interface ResumeAnalysisResult {
  id: string;
  userId: string;
  resumeId: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  /** 0–100 overall score. */
  overallScore: number;
  /** 0–100 ATS compatibility score. */
  atsScore: number;
  breakdown: ScoreDimension[];
  issues: ResumeIssue[];
  suggestions: ResumeSuggestion[];
  keywords: KeywordAnalysis;
  atsCompatibility: AtsCompatibility;
  parsedData: ParsedResumeData;
  strengths: string[];
  weaknesses: string[];
  /** Target job title used for relevance scoring, if provided. */
  targetRole: string | null;
  /** Model/version used for this analysis. */
  modelVersion: string;
}

/** Summary view of an analysis (for list displays). */
export interface ResumeAnalysisSummary {
  id: string;
  resumeId: string;
  fileName: string;
  overallScore: number;
  atsScore: number;
  status: AnalysisStatus;
  createdAt: string;
  issueCount: number;
  suggestionCount: number;
}

/** Comparison between two analysis runs (e.g. before/after edits). */
export interface AnalysisComparison {
  previous: ResumeAnalysisSummary;
  current: ResumeAnalysisSummary;
  scoreDelta: number;
  atsScoreDelta: number;
  resolvedIssues: string[];
  newIssues: string[];
  improvedCategories: ScoreCategory[];
  declinedCategories: ScoreCategory[];
}

/* ============================= Request / Response ========================== */

/** Request payload to initiate a resume analysis. */
export interface ResumeAnalysisRequest {
  resumeId: string;
  userId: string;
  /** Optional target role for relevance scoring. */
  targetRole?: string;
  /** Optional job description text for keyword matching. */
  jobDescription?: string;
  /** Whether to include detailed ATS compatibility check. */
  includeAts?: boolean;
  /** Whether to include keyword analysis. */
  includeKeywords?: boolean;
}

/** Response from the analysis API. */
export interface ResumeAnalysisResponse {
  success: boolean;
  data: ResumeAnalysisResult | null;
  error: ResumeAnalysisError | null;
}

/** Error structure for analysis failures. */
export interface ResumeAnalysisError {
  code: ResumeAnalysisErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
}

export type ResumeAnalysisErrorCode =
  | "PARSE_FAILED"
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "FILE_EMPTY"
  | "AI_UNAVAILABLE"
  | "AUTH_REQUIRED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INTERNAL_ERROR"
  | "TIMEOUT";

/* =============================== Progress / UI ============================ */

/** Real-time progress update during analysis. */
export interface AnalysisProgress {
  stage: ResumeAnalysisStage;
  /** 0–100 percentage within current stage. */
  percentage: number;
  message: string;
  startedAt: string;
  estimatedSecondsRemaining: number | null;
}

/** UI state for the analysis workflow. */
export interface ResumeAnalysisUiState {
  stage: ResumeAnalysisStage;
  progress: AnalysisProgress | null;
  currentResult: ResumeAnalysisResult | null;
  history: ResumeAnalysisSummary[];
  error: ResumeAnalysisError | null;
}

/* ================================ AI Gateway =============================== */

/** Prompt context sent to the AI gateway for analysis. */
export interface AiAnalysisPromptContext {
  resumeText: string;
  targetRole: string | null;
  jobDescription: string | null;
  previousScores: { category: ScoreCategory; score: number }[] | null;
  userPreferences: {
    industry?: string;
    experienceLevel?: string;
    region?: string;
  } | null;
}

/** Structured response expected from the AI model. */
export interface AiAnalysisRawResponse {
  overallScore: number;
  atsScore: number;
  breakdown: {
    category: ScoreCategory;
    score: number;
    summary: string;
    tips: string[];
  }[];
  issues: {
    severity: IssueSeverity;
    section: ResumeSection;
    title: string;
    description: string;
    suggestion?: string;
  }[];
  suggestions: {
    section: ResumeSection;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    example?: string;
    estimatedImpact?: number;
  }[];
  keywords: {
    matched: string[];
    missing: string[];
    irrelevant: string[];
  };
  strengths: string[];
  weaknesses: string[];
  parsedData: ParsedResumeData;
}

/* =============================== History / Trends ========================= */

/** A single data point for score trend visualization. */
export interface AnalysisTrendPoint {
  analysisId: string;
  date: string;
  overallScore: number;
  atsScore: number;
}

/** Aggregated history for a user's resume analyses. */
export interface ResumeAnalysisHistory {
  userId: string;
  totalAnalyses: number;
  latestAnalysis: ResumeAnalysisSummary | null;
  trend: AnalysisTrendPoint[];
  averageScore: number;
  bestScore: number;
}

/* ================================= Filters ================================ */

/** Filters for querying analysis history. */
export interface AnalysisHistoryFilters {
  status?: AnalysisStatus;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
  resumeId?: string;
  sortBy?: "date" | "score" | "ats-score";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}