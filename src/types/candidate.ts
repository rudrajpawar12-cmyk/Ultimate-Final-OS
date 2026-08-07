/**
 * Candidate domain types.
 * Shared by repositories, services, hooks and UI.
 */

export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
export type Priority = "high" | "medium" | "low";

export interface Skill {
  id: string;
  name: string;
  level: Proficiency;
  years?: number;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  grade?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  summary?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  url?: string;
  tech: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedOn: string;
  credentialUrl?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  headline: string;
  email: string;
  phone?: string;
  location?: string;
  bio: string;
  skills: Skill[];
  education: Education[];
  experience: Experience[];
  projects: ProjectItem[];
  certifications: Certification[];
  social: SocialLinks;
  preferences: CareerPreferences;
  completion: ProfileCompletion;
}

export interface CareerPreferences {
  desiredRoles: string[];
  locations: string[];
  workMode: "remote" | "hybrid" | "onsite";
  minSalary: number;
  noticePeriod: string;
  openToRelocate: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  sections: { label: string; done: boolean }[];
}

/* ---------------------------------- Resume --------------------------------- */

export interface ResumeFile {
  id: string;
  fileName: string;
  sizeKb: number;
  uploadedAt: string;
  status: "active" | "archived";
  version: number;
}

/* ------------------------------- AI analysis ------------------------------- */

export type AnalysisStage = "idle" | "uploading" | "processing" | "analyzing" | "done" | "error";

export interface ScoreBreakdown {
  label: string;
  score: number;
  summary: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  createdAt: string;
  overallScore: number;
  atsScore: number;
  breakdown: ScoreBreakdown[];
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
}

export type AnalysisOutcome =
  | { kind: "ok"; analysis: ResumeAnalysis }
  | { kind: "unavailable"; message: string }
  | { kind: "insufficient-data"; message: string };

/* ------------------------------- Skill gap --------------------------------- */

export interface SkillGap {
  targetRole: string;
  matchScore: number;
  matching: { name: string; level: number }[];
  missing: { name: string; priority: Priority; demand: number }[];
  recommendations: {
    id: string;
    title: string;
    provider: string;
    hours: number;
    skill: string;
    url?: string;
  }[];
}

/* ---------------------------------- Jobs ----------------------------------- */

export interface Job {
  id: string;
  title: string;
  company: string;
  companyInitials: string;
  location: string;
  remote: boolean;
  experience: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  skills: string[];
  matchScore: number;
  postedAt: string;
  saved: boolean;
  type: "full-time" | "part-time" | "contract" | "internship";
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  matchingSkills: string[];
  missingSkills: string[];
}

export interface JobFilters {
  query: string;
  location: string;
  remoteOnly: boolean;
  minSalary: number;
  experience: string;
  skills: string[];
  sort: "relevance" | "recent" | "salary";
}

/* ------------------------------ Applications ------------------------------- */

export type ApplicationStatus =
  "applied" | "under-review" | "shortlisted" | "interview" | "offer" | "rejected" | "withdrawn";

export interface ApplicationEvent {
  id: string;
  status: ApplicationStatus;
  date: string;
  note?: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  status: ApplicationStatus;
  nextAction?: string;
  notes?: string;
  timeline: ApplicationEvent[];
}

/* -------------------------------- Interviews -------------------------------- */

export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export interface Interview {
  id: string;
  jobTitle: string;
  company: string;
  round: string;
  mode: "video" | "phone" | "onsite";
  scheduledAt: string;
  durationMinutes: number;
  interviewer: string;
  status: InterviewStatus;
  notes?: string;
  feedback?: string;
}

/* ------------------------------- Preparation -------------------------------- */

export interface PrepQuestion {
  id: string;
  category: "technical" | "behavioral";
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  practiced: boolean;
}

export interface PrepOverview {
  questions: PrepQuestion[];
  suggestedTopics: { topic: string; reason: string }[];
  progress: { practiced: number; total: number; readiness: number };
}

/* -------------------------------- Analytics --------------------------------- */

export interface TrendPoint {
  label: string;
  value: number;
}

export interface CandidateAnalytics {
  resumeScoreTrend: TrendPoint[];
  applicationTrend: TrendPoint[];
  interviewRate: number;
  successRate: number;
  skillGrowth: TrendPoint[];
  profileCompletion: number;
}

/* --------------------------------- Dashboard -------------------------------- */

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export interface CandidateDashboardData {
  profile: CandidateProfile;
  resumeScore: { score: number; ats: number; updatedAt: string };
  insights: { id: string; title: string; description: string }[];
  recommendedJobs: Job[];
  savedJobs: Job[];
  applications: Application[];
  interviews: Interview[];
  notifications: DashboardNotification[];
}

/* -------------------------------- Onboarding -------------------------------- */

export type OnboardingStepId =
  | "welcome"
  | "basic"
  | "photo"
  | "education"
  | "skills"
  | "experience"
  | "projects"
  | "certifications"
  | "resume"
  | "preferences"
  | "analysis"
  | "complete";

export interface OnboardingData {
  basic?: {
    fullName: string;
    headline: string;
    phone?: string;
    location?: string;
    bio?: string;
  };
  photoDataUrl?: string;
  education?: Education[];
  skills?: string[];
  experience?: Experience[];
  projects?: ProjectItem[];
  certifications?: Certification[];
  resumeFileName?: string;
  preferences?: Partial<CareerPreferences>;
}

export interface OnboardingState {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  data: OnboardingData;
}

/* --------------------------------- Settings --------------------------------- */

export interface CandidateSettings {
  account: { email: string; language: string; timezone: string };
  security: { twoFactor: boolean; lastPasswordChange: string };
  preferences: { jobAlerts: boolean; weeklyDigest: boolean; profileVisible: boolean };
  notifications: {
    applicationUpdates: boolean;
    interviewReminders: boolean;
    newMatches: boolean;
    productNews: boolean;
  };
  subscription: {
    plan: "free" | "pro";
    renewsOn: string;
    aiCreditsUsed: number;
    aiCredits: number;
  };
}
