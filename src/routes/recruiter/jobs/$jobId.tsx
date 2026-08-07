import { createFileRoute } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { JobStatusBadge } from "@/components/recruiter/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useDuplicateJob, useJob, useJobStatusMutation } from "@/hooks/use-hiring";
import { hiringService } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job details — CareerOS" },
      { name: "description", content: "Overview, pipeline progress and activity for this role." },
      { property: "og:title", content: "Job details — CareerOS" },
      { property: "og:description", content: "Applicants, timeline and hiring progress." },
    ],
  }),
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const duplicate = useDuplicateJob();
  const status = useJobStatusMutation();

  return (
    <RecruiterPage
      title={job.data?.title ?? "Job details"}
      description={job.data ? `${job.data.department} · ${job.data.location}` : undefined}
      breadcrumbs={[
        { label: "Recruiter", to: "/recruiter" },
        { label: "Jobs", to: "/recruiter/jobs" },
        { label: job.data?.title ?? "Job" },
      ]}
      actions={
        job.data ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => duplicate.mutate(jobId)}>
              Duplicate
            </Button>
            <Button
              variant="outline"
              onClick={() => status.mutate({ id: jobId, status: "paused" })}
            >
              Pause
            </Button>
            <Button onClick={() => status.mutate({ id: jobId, status: "closed" })}>Close</Button>
          </div>
        ) : undefined
      }
    >
      <AsyncSection
        isLoading={job.isLoading}
        isError={job.isError}
        data={job.data ?? undefined}
        onRetry={() => void job.refetch()}
      >
        {(data) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Applicants" value={data.applicantCount} />
              <StatCard label="Interviews" value={data.interviewCount} />
              <StatCard label="Offers" value={data.offerCount} />
              <StatCard label="Views" value={data.views} />
            </div>

            <Card className="shadow-elevated border-border/70">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle>Hiring progress</CardTitle>
                <JobStatusBadge status={data.status} />
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress
                  value={hiringService.hiringProgress(data)}
                  aria-label="Hiring progress"
                />
                <p className="text-sm text-muted-foreground">
                  {hiringService.formatSalary(data)} · {data.experienceMin}–{data.experienceMax}{" "}
                  years · closes{" "}
                  {data.closingDate ? hiringService.formatDate(data.closingDate) : "when filled"}
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="shadow-elevated border-border/70 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="leading-relaxed text-muted-foreground">{data.description}</p>
                  <div>
                    <h3 className="mb-2 font-semibold">Responsibilities</h3>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {data.responsibilities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Benefits</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.benefits.map((item) => (
                        <Badge key={item} variant="outline" className="rounded-full">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Required skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.skills.map((item) => (
                        <Badge key={item} variant="secondary" className="rounded-full">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Timeline & activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {data.timeline.map((event) => (
                      <li key={event.id} className="border-l-2 border-border pl-4">
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {hiringService.formatDate(event.date)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </AsyncSection>
    </RecruiterPage>
  );
}