import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Briefcase, CalendarClock, Sparkles, Users } from "lucide-react";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { useHiringOverview } from "@/hooks/use-hiring";
import { useRecruiterProfile } from "@/hooks/use-recruiter";
import { useCompanyByRecruiter } from "@/hooks/use-company";
import { hiringService, PIPELINE_STAGE_LABEL } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/")({
  head: () => ({
    meta: [
      { title: "Recruiter workspace — CareerOS" },
      {
        name: "description",
        content: "Your CareerOS recruiter workspace: jobs, AI shortlists and hiring pipeline.",
      },
      { property: "og:title", content: "Recruiter workspace — CareerOS" },
      {
        property: "og:description",
        content: "Jobs, explainable AI shortlists and pipeline analytics.",
      },
    ],
  }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const overview = useHiringOverview();

const recruiter = useRecruiterProfile();

const company = useCompanyByRecruiter(recruiter.data?.id);

  return (
    <RecruiterPage
      title={
        recruiter.data
          ? `Welcome back, ${recruiter.data.fullName}`
          : "Hiring Overview"
      }
      description={
        recruiter.data
          ? `${recruiter.data.jobTitle} • ${
              company.data?.companyName ?? recruiter.data.companyName
            }`
          : "Live pipeline, interviews and AI insights across your open roles."
      }
      breadcrumbs={[{ label: "Recruiter" }]}
      actions={
        <Button asChild>
          <Link to="/recruiter/jobs/new">Post a job</Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={overview.isLoading}
        isError={overview.isError}
        data={overview.data}
        onRetry={() => void overview.refetch()}
      >
        {(data) => {
          const maxStage = data.pipeline.reduce((peak, s) => Math.max(peak, s.count), 0);

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Open positions" value={data.openPositions} icon={Briefcase} />
                <StatCard label="New applicants" value={data.newApplicants} icon={Users} />
                <StatCard
                  label="Interviews today"
                  value={data.interviewsToday}
                  icon={CalendarClock}
                />
                <StatCard
                  label="Avg. time to hire"
                  value={`${data.avgTimeToHire} days`}
                  icon={BarChart3}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="shadow-elevated border-border/70 lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Pipeline</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/recruiter/pipeline">Open board</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.pipeline.map((stage) => (
                      <div key={stage.stage} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{PIPELINE_STAGE_LABEL[stage.stage]}</span>
                          <span className="text-muted-foreground">{stage.count}</span>
                        </div>
                        <Progress
                          value={maxStage > 0 ? Math.round((stage.count / maxStage) * 100) : 0}
                          aria-label={`${PIPELINE_STAGE_LABEL[stage.stage]} candidates`}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-border/70">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-4" aria-hidden="true" />
                      AI insights
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/recruiter/ai">Workspace</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.aiInsights.map((insight) => (
                      <div key={insight.id} className="rounded-lg border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{insight.title}</p>
                          <Badge
                            variant={insight.tone === "warning" ? "destructive" : "secondary"}
                            className="rounded-full capitalize"
                          >
                            {insight.tone}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <p className="text-sm">
                        <span className="font-medium">{item.actor}</span> {item.action}{" "}
                        <span className="font-medium">{item.target}</span>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {hiringService.relativeTime(item.at)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </AsyncSection>
    </RecruiterPage>
  );
}
