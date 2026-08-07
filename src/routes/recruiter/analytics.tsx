import { createFileRoute } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useRecruiterAnalytics } from "@/hooks/use-hiring";
import { hiringService } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/analytics")({
  head: () => ({
    meta: [
      { title: "Hiring analytics — CareerOS" },
      { name: "description", content: "Funnel conversion, time-to-hire and sourcing insights." },
      { property: "og:title", content: "Hiring analytics — CareerOS" },
      { property: "og:description", content: "Measure and improve your hiring performance." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const analytics = useRecruiterAnalytics();

  return (
    <RecruiterPage title="Analytics" description="How your hiring funnel is performing.">
      <AsyncSection
        isLoading={analytics.isLoading}
        isError={analytics.isError}
        data={analytics.data}
        onRetry={() => void analytics.refetch()}
      >
        {(data) => {
          const summary = hiringService.analyticsSummary(data);
          const funnel = hiringService.toPercentages(data.funnel);
          const sources = hiringService.toPercentages(data.sources);

          return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Applications" value={summary.totalApplications} />
              <StatCard label="Avg. time to hire" value={`${summary.avgTimeToHire} days`} />
              <StatCard label="Offer acceptance" value={`${summary.offerAcceptanceRate}%`} />
              <StatCard label="Active roles" value={summary.activeJobs} />
            </div>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle>Funnel conversion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {funnel.map((step) => (
                  <div key={step.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{step.label}</span>
                      <span className="text-muted-foreground">{step.value}</span>
                    </div>
                    <Progress value={step.percentage} aria-label={`${step.label} conversion`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Top sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{source.label}</span>
                        <span className="text-muted-foreground">{source.value}</span>
                      </div>
                      <Progress value={source.percentage} aria-label={source.label} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Top performing jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {data.jobPerformance.map((job) => (
                      <li key={job.job} className="flex justify-between gap-3">
                        <span className="truncate">{job.job}</span>
                        <span className="text-muted-foreground">{job.applicants} applicants</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
          );
        }}
      </AsyncSection>
    </RecruiterPage>
  );
}
