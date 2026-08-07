import type { CompletionReport, CompletionSection } from "@/types/onboarding";

/**
 * Reusable profile completion engine.
 * Services describe weighted sections; this module turns them into a report.
 * Never call this from a component directly — go through a service + hook.
 */

export interface CompletionRule {
  id: string;
  label: string;
  hint: string;
  weight?: number;
  done: boolean;
}

export function buildCompletionReport(rules: CompletionRule[]): CompletionReport {
  const sections: CompletionSection[] = rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    hint: rule.hint,
    done: rule.done,
    weight: rule.weight ?? 1,
  }));

  const total = sections.reduce((sum, section) => sum + section.weight, 0);
  const earned = sections.reduce((sum, section) => sum + (section.done ? section.weight : 0), 0);
  const missing = sections.filter((section) => !section.done);

  return {
    percentage: total === 0 ? 0 : Math.round((earned / total) * 100),
    complete: missing.length === 0,
    sections,
    missing,
    next: missing[0] ?? null,
  };
}
