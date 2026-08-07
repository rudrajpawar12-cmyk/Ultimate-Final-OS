import type { ReactNode } from "react";

import { DashboardLayout, type Crumb } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { candidateNav } from "@/components/candidate/candidate-nav";
import { CandidateOnboardingGate } from "@/components/onboarding/onboarding-gate";
import { SectionHeader } from "@/components/ui/page-container";

interface CandidatePageProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps every candidate page in the shared shell + role gate so no page
 * duplicates layout or auth logic.
 */
export function CandidatePage({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: CandidatePageProps) {
  return (
    <ProtectedRoute role="candidate">
      <CandidateOnboardingGate>
        <DashboardLayout
          groups={candidateNav}
          breadcrumbs={breadcrumbs ?? [{ label: "Candidate", to: "/candidate" }, { label: title }]}
        >
          <SectionHeader align="left" title={title} description={description} actions={actions} />
          <div className="mt-6 space-y-6">{children}</div>
        </DashboardLayout>
      </CandidateOnboardingGate>
    </ProtectedRoute>
  );
}
