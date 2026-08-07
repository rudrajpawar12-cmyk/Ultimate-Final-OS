/**
 * Shared onboarding engine types.
 * Role-agnostic: reused by candidate and recruiter flows.
 */

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export interface OnboardingStepMeta<TId extends string = string> {
  id: TId;
  title: string;
  description: string;
  skippable?: boolean;
  /** Steps that render their own navigation (analysis, completion). */
  terminal?: boolean;
}

export interface OnboardingFlowState<TId extends string, TData> {
  currentStep: TId;
  completedSteps: TId[];
  data: TData;
}

/* --------------------------- Profile completion --------------------------- */

export interface CompletionSection {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  weight: number;
}

export interface CompletionReport {
  percentage: number;
  complete: boolean;
  sections: CompletionSection[];
  missing: CompletionSection[];
  next: CompletionSection | null;
}
