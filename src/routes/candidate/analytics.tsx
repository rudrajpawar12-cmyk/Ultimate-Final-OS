import { createFileRoute, Link } from "@tanstack/react-router";

import { AiCareerRecommendationsCard } from "@/components/ai/career-ai-panels";
import { AsyncSection } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useCandidateAnalytics } from "@/hooks/use-candidate";
import type { TrendPoint } from "@/types/candidate";

export const Route = createFileRoute("/candidate/analytics")({
  head: () => ({
    meta: [
      { title: "Career analytics — CareerOS" },
      {
        name: "description",
        content: "Track resume score, application volume, interview rate and skill growth.",
      },
      { property: "og:title", content: "Career analytics — CareerOS" },
      { property: "og:description", content: "Measure your job-search performance over time." },
    ],
  }),
  component: CandidateAnalyticsPage,
});

function CandidateAnalyticsPage() {
  const query = useCandidateAnalytics();

  return (
    <CandidatePage
      title="Analytics"
      description="How your job search is trending over the last few months."
      actions={
        <Button asChild variant="outline">
          <Link to="/candidate/applications">View applications</Link>
        </Button>
      }
    >
      <AiCareerRecommendationsCard />

      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        }
      >
        {(data) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Interview rate" value={`${data.interviewRate}%`} />
              <StatCard label="Success rate" value={`${data.successRate}%`} />
              <StatCard label="Profile completion" value={`${data.profileCompletion}%`} />
              <StatCard
                label="Latest resume score"
                value={data.resumeScoreTrend.at(-1)?.value ?? "—"}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TrendCard
                title="Resume score"
                description="Score after each analysis run."
                points={data.resumeScoreTrend}
                suffix=""
              />
              <TrendCard
                title="Applications sent"
                description="Volume per period."
                points={data.applicationTrend}
                suffix=""
              />
            </div>

            <TrendCard
              title="Skill growth"
              description="Verified skill strength over time."
              points={data.skillGrowth}
              suffix=""
            />
          </div>
        )}
      </AsyncSection>
    </CandidatePage>
  );
}

function TrendCard({
  title,
  description,
  points,
  suffix,
}: {
  title: string;
  description: string;
  points: TrendPoint[];
  suffix?: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.length ? (
          points.map((point) => (
            <div key={point.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{point.label}</span>
                <span className="text-muted-foreground">
                  {point.value}
                  {suffix}
                </span>
              </div>
              <Progress value={(point.value / max) * 100} aria-label={`${title} ${point.label}`} />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Not enough data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
