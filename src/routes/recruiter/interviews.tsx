import { createFileRoute } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { InterviewStateBadge } from "@/components/recruiter/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInterviews } from "@/hooks/use-hiring";
import { hiringService } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/interviews")({
  head: () => ({
    meta: [
      { title: "Interviews — CareerOS" },
      { name: "description", content: "Upcoming and past interviews with panel and feedback." },
      { property: "og:title", content: "Interviews — CareerOS" },
      { property: "og:description", content: "Schedule, review and track interview outcomes." },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  const interviews = useInterviews();

  return (
    <RecruiterPage title="Interviews" description="Your scheduled and completed interviews.">
      <AsyncSection
        isLoading={interviews.isLoading}
        isError={interviews.isError}
        data={interviews.data}
        onRetry={() => void interviews.refetch()}
        emptyTitle="No interviews scheduled"
        isEmpty={(data) => data.length === 0}
      >
        {(data) => (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((interview) => (
              <Card key={interview.id} className="shadow-elevated border-border/70">
                <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <CardTitle className="truncate">{interview.applicantName}</CardTitle>
                  <InterviewStateBadge state={interview.state} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{interview.jobTitle}</p>
                  <p>
                    {hiringService.formatDateTime(interview.scheduledAt)} ·{" "}
                    {interview.durationMinutes} min · {interview.mode}
                  </p>
                  <p>Panel: {interview.panel.map((member) => member.name).join(", ")}</p>
                  {interview.feedback ? (
                    <p className="rounded-xl bg-muted/50 p-3 text-foreground">
                      {interview.feedback.rating}/5 — {interview.feedback.summary} (
                      {interview.feedback.author})
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncSection>
    </RecruiterPage>
  );
}
