import { createFileRoute } from "@tanstack/react-router";

import { CopilotChat } from "@/components/ai/copilot-chat";
import { AiInsightPanel } from "@/components/ai/ai-insight-panel";
import { candidateNav } from "@/components/candidate/candidate-nav";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { recruiterNav } from "@/components/recruiter/recruiter-nav";
import { SectionHeader } from "@/components/ui/page-container";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "AI Career Copilot — CareerOS" },
      {
        name: "description",
        content:
          "Chat with the CareerOS copilot for resume rewrites, interview prep, skill plans and career roadmaps.",
      },
      { property: "og:title", content: "AI Career Copilot — CareerOS" },
      {
        property: "og:description",
        content: "Your always-on career assistant inside CareerOS.",
      },
    ],
  }),
  component: CopilotPage,
});

function CopilotPage() {
  const { user } = useAuth();
  const audience = user?.role === "recruiter" ? "recruiter" : "candidate";

  return (
    <ProtectedRoute>
      <DashboardLayout
        groups={audience === "recruiter" ? recruiterNav : candidateNav}
        breadcrumbs={[{ label: "Workspace" }, { label: "AI Copilot" }]}
      >
        <SectionHeader
          align="left"
          title="AI Career Copilot"
          description={
            audience === "recruiter"
              ? "Draft screening questions, compare candidates and unblock your pipeline."
              : "Improve your resume, plan your next role and prepare for interviews."
          }
        />
        <div className="mt-6 flex flex-col gap-8">
          <CopilotChat audience={audience} />
          <AiInsightPanel
            audience={audience}
            topic={audience === "recruiter" ? "recruitment-health" : "career-growth"}
            deferred
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
