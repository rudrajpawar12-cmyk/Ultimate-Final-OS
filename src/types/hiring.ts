/**
 * Recruiter hiring domain types.
 * Shared by fixtures, repositories, services, hooks and UI.
 */

export type JobStatus = "draft" | "active" | "paused" | "closed" | "archived";

export type WorkMode = "remote" | "hybrid" | "onsite";

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: "text" | "boolean" | "choice";
  required: boolean;
  options?: string[];
}

export interface HiringTeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface JobTimelineEvent {
  id: string;
  label: string;
  description: string;
  date: string;
  type: "created" | "published" | "applicant" | "interview" | "offer" | "note";
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  employmentType: string;
  status: JobStatus;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: string[];
  benefits: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  hiringTeam: HiringTeamMember[];
  screeningQuestions: ScreeningQuestion[];
  createdAt: string;
  updatedAt: string;
  closingDate?: string;
  applicantCount: number;
  interviewCount: number;
  offerCount: number;
  hiredCount: number;
  views: number;
  timeline: JobTimelineEvent[];
}

export type JobDraft = Omit<
  Job,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "applicantCount"
  | "interviewCount"
  | "offerCount"
  | "hiredCount"
  | "views"
  | "timeline"
>;

export type PipelineStage =
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface ApplicantExperience {
  id: string;
  company: string;
  title: string;
  period: string;
  summary: string;
}

export interface ApplicantEducation {
  id: string;
  school: string;
  degree: string;
  period: string;
}

export interface ApplicantProject {
  id: string;
  name: string;
  description: string;
  link?: string;
}

export interface ApplicantCertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface ApplicantNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface ApplicantAiInsight {
  resumeScore: number;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

/** One pipeline stage transition, stored in `application_stage_events`. */
export interface ApplicantStageEvent {
  id: string;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  actor: string;
  createdAt: string;
}

export interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
  stage: PipelineStage;
  appliedAt: string;
  experienceYears: number;
  educationLevel: string;
  skills: string[];
  source: string;
  resumeFileName: string;
  portfolioUrl?: string;
  socials: { label: string; url: string }[];
  experience: ApplicantExperience[];
  education: ApplicantEducation[];
  projects: ApplicantProject[];
  certifications: ApplicantCertification[];
  notes: ApplicantNote[];
  ai: ApplicantAiInsight;
  /** Recruiter-defined labels persisted in `application_tags`. */
  tags?: string[];
  /** Pipeline stage history persisted in `application_stage_events`. */
  stageHistory?: ApplicantStageEvent[];
}

export type InterviewStage = "screening" | "technical" | "culture" | "final";
export type InterviewState = "scheduled" | "completed" | "cancelled";

export interface Interview {
  id: string;
  applicantId: string;
  applicantName: string;
  jobId: string;
  jobTitle: string;
  stage: InterviewStage;
  state: InterviewState;
  scheduledAt: string;
  durationMinutes: number;
  mode: "video" | "onsite" | "phone";
  location: string;
  panel: { id: string; name: string; role: string }[];
  notes: string;
  feedback?: { rating: number; summary: string; author: string };
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  type: "application" | "interview" | "offer" | "job" | "note";
}

export interface HiringOverview {
  openPositions: number;
  activeJobs: number;
  newApplicants: number;
  interviewsToday: number;
  offersOut: number;
  avgTimeToHire: number;
  pipeline: { stage: PipelineStage; count: number }[];
  aiInsights: { id: string; title: string; body: string; tone: "positive" | "warning" | "info" }[];
  activity: ActivityItem[];
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface RecruiterAnalytics {
  applicationsOverTime: { label: string; applications: number; qualified: number }[];
  funnel: SeriesPoint[];
  timeToHire: SeriesPoint[];
  offerAcceptance: { label: string; accepted: number; declined: number }[];
  sources: SeriesPoint[];
  interviewConversion: SeriesPoint[];
  recruiterActivity: { label: string; screens: number; interviews: number }[];
  jobPerformance: { job: string; applicants: number; hires: number; conversion: number }[];
}

export type AiRunState = "idle" | "processing" | "completed" | "failed";

export interface AiRanking {
  applicantId: string;
  name: string;
  jobTitle: string;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: string;
}

export interface AiWorkspaceResult {
  jobId: string;
  generatedAt: string;
  rankings: AiRanking[];
  summary: string;
}

export interface RecruiterTeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "recruiter" | "interviewer" | "viewer";
  status: "active" | "invited";
}

export interface RecruiterSettings {
  company: {
    name: string;
    website: string;
    industry: string;
    size: string;
    headquarters: string;
    about: string;
  };
  branding: { primaryColor: string; logoText: string; careersTagline: string };
  team: RecruiterTeamMember[];
  permissions: { id: string; label: string; description: string; enabled: boolean }[];
  notifications: { id: string; label: string; description: string; enabled: boolean }[];
  security: { twoFactor: boolean; ssoEnforced: boolean; sessionTimeoutMinutes: number };
  subscription: { plan: string; seats: number; usedSeats: number; renewsOn: string };
  preferences: { timezone: string; dateFormat: string; defaultJobVisibility: string };
}