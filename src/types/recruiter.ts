import type { OnboardingFlowState } from "@/types/onboarding";

/**
 * Recruiter domain types.
 * Shared by repositories, services, hooks and UI.
 */

export type RecruiterOnboardingStepId =
  | "welcome"
  | "company"
  | "logo"
  | "website"
  | "industry"
  | "size"
  | "hiring"
  | "profile"
  | "complete";

export interface CompanyInfo {
  name: string;
  tagline?: string;
  description?: string;
  headquarters?: string;
  foundedYear?: string;
}

export interface CompanyWebLinks {
  website?: string;
  careersPage?: string;
  linkedin?: string;
}

export interface CompanyIndustry {
  primary?: string;
  specialties: string[];
}

export interface CompanyScale {
  employees?: string;
  openRoles?: string;
  hiringVolume?: string;
}

export interface HiringPreferences {
  roles: string[];
  locations: string[];
  workModes: ("remote" | "hybrid" | "onsite")[];
  seniority: string[];
  urgency?: "immediate" | "this-quarter" | "ongoing";
  screeningNotes?: string;
}

export interface RecruiterIdentity {
  fullName: string;
  jobTitle: string;
  department?: string;
  workEmail?: string;
  phone?: string;
}

export interface RecruiterOnboardingData {
  company?: CompanyInfo;
  logoDataUrl?: string;
  links?: CompanyWebLinks;
  industry?: CompanyIndustry;
  scale?: CompanyScale;
  hiring?: HiringPreferences;
  recruiter?: RecruiterIdentity;
}

export type RecruiterOnboardingState = OnboardingFlowState<
  RecruiterOnboardingStepId,
  RecruiterOnboardingData
>;
