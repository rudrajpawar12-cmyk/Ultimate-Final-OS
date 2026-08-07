import type { RecruiterOnboardingState } from "@/types/recruiter";

/**
 * Data source boundary for recruiter features.
 * Swapping this for a Supabase implementation must not touch services or UI.
 */
export interface RecruiterRepository {
  getOnboardingState(): Promise<RecruiterOnboardingState>;
  saveOnboardingState(state: RecruiterOnboardingState): Promise<RecruiterOnboardingState>;
  resetOnboarding(): Promise<RecruiterOnboardingState>;
}

const ONBOARDING_KEY = "careeros.recruiter.onboarding";

function delay(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const emptyRecruiterOnboardingState: RecruiterOnboardingState = {
  currentStep: "welcome",
  completedSteps: [],
  data: {},
};

function read(): RecruiterOnboardingState {
  if (typeof window === "undefined") return clone(emptyRecruiterOnboardingState);
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    return raw
      ? (JSON.parse(raw) as RecruiterOnboardingState)
      : clone(emptyRecruiterOnboardingState);
  } catch {
    return clone(emptyRecruiterOnboardingState);
  }
}

function write(state: RecruiterOnboardingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

export const localRecruiterRepository: RecruiterRepository = {
  async getOnboardingState() {
    await delay(240);
    return read();
  },
  async saveOnboardingState(state) {
    await delay(260);
    write(state);
    return clone(state);
  },
  async resetOnboarding() {
    await delay(200);
    const fresh = clone(emptyRecruiterOnboardingState);
    write(fresh);
    return fresh;
  },
};
