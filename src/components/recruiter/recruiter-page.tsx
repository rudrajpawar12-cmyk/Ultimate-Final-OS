import type { ReactNode } from "react";

import { DashboardLayout, type Crumb } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { RecruiterOnboardingGate } from "@/components/onboarding/onboarding-gate";
import { recruiterNav } from "@/components/recruiter/recruiter-nav";
import { SectionHeader } from "@/components/ui/page-container";

interface RecruiterPageProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Wraps every recruiter page in the shared shell + role gate so no page
 * duplicates layout or auth logic.
 */
export function RecruiterPage({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: RecruiterPageProps) {
  return (
    <ProtectedRoute role="recruiter">
      <RecruiterOnboardingGate>
        <DashboardLayout
          groups={recruiterNav}
          breadcrumbs={breadcrumbs ?? [{ label: "Recruiter", to: "/recruiter" }, { label: title }]}
        >
          <SectionHeader align="left" title={title} description={description} actions={actions} />
          <div className="mt-6 space-y-6">{children}</div>
        </DashboardLayout>
      </RecruiterOnboardingGate>
    </ProtectedRoute>
  );
}