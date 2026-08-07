import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  CalendarClock,
  FileSearch,
  FileText,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import { AsyncSection, StatsSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { candidateNav } from "@/components/candidate/candidate-nav";
import { JobCard } from "@/components/candidate/job-card";
import { ApplicationStatusBadge } from "@/components/candidate/status-badges";
import { ProfileCompletionWidget } from "@/components/candidate/profile-completion-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { useAuth } from "@/hooks/use-auth";
import { useCandidateDashboard, useToggleSavedJob } from "@/hooks/use-candidate";
import { candidateService } from "@/services/candidate.service";

export { candidateNav };

export const Route = createFileRoute("/candidate/")({
  head: () => ({
    meta: [
      { title: "Candidate dashboard — CareerOS" },
      {
        name: "description",
        content:
          "Your CareerOS career command center: resume score, AI matches, applications and interviews.",
      },
      { property: "og:title", content: "Candidate dashboard — CareerOS" },
      {
        property: "og:description",
        content: "Resume score, AI job matches, applications and upcoming interviews in one place.",
      },
    ],
  }),
  component: CandidateDashboard,
});

const quickActions = [
  { label: "Upload resume", to: "/candidate/resume", icon: FileText },
  { label: "Run AI analysis", to: "/candidate/resume-analyzer", icon: FileSearch },
  { label: "Find jobs", to: "/candidate/jobs", icon: Briefcase },
  { label: "Complete profile", to: "/candidate/profile", icon: UserRound },
] as const;

function CandidateDashboard() {
  const { user } = useAuth();
  const dashboard = useCandidateDashboard();
  const toggleSave = useToggleSavedJob();

  const firstName = (user?.fullName ?? "there").split(" ")[0];

  return (
    <CandidatePage
      title={`Welcome back, ${firstName}`}
      description="Your career command center — scores, matches and next actions, all live."
      breadcrumbs={[{ label: "Candidate" }]}
      actions={
        <Button asChild>
          <Link to="/candidate/jobs">
            Browse jobs
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={dashboard.isLoading}
        isError={dashboard.isError}
        data={dashboard.data}
        onRetry={() => void dashboard.refetch()}
        skeleton={<StatsSkeleton />}
      >
        {(data) => {
          const upcoming = data.interviews;
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Resume score"
                  value={data.resumeScore.score}
                  icon={FileText}
                  trend={{ value: "+11", direction: "up" }}
                  hint={`ATS ${data.resumeScore.ats}`}
                />
                <StatCard
                  label="Active matches"
                  value={data.recommendedJobs.length}
                  icon={Target}
                  hint="Refreshed today"
                />
                <StatCard
                  label="Applications"
                  value={data.applications.length}
                  icon={Briefcase}
                  hint={`${data.applications.filter((a) => a.status === "interview").length} in interview`}
                />
                <StatCard
                  label="Interviews"
                  value={upcoming.length}
                  icon={CalendarClock}
                  hint="Scheduled"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <ProfileCompletionWidget className="shadow-elevated" />

                <Card className="shadow-elevated border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">Resume score</CardTitle>
                    <CardDescription>
                      Last analysed {new Date(data.resumeScore.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-bold tracking-tight">
                        {data.resumeScore.score}
                      </span>
                      <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ATS readiness</span>
                        <span className="font-medium">{data.resumeScore.ats}%</span>
                      </div>
                      <Progress value={data.resumeScore.ats} />
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/candidate/resume-analyzer">Open analyzer</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="size-4 text-primary" />
                      Career insights
                    </CardTitle>
                    <CardDescription>What to fix next, ranked by impact.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.insights.map((insight) => (
                      <div key={insight.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-sm font-semibold">{insight.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {quickActions.map((action) => (
                    <Button
                      key={action.to}
                      asChild
                      variant="outline"
                      className="h-auto justify-start gap-3 py-3"
                    >
                      <Link to={action.to}>
                        <action.icon className="size-4 text-primary" />
                        {action.label}
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Recommended for you</h3>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/candidate/jobs">See all</Link>
                  </Button>
                </div>
                {data.recommendedJobs.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {data.recommendedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isSaving={toggleSave.isPending}
                        onToggleSave={(id) => toggleSave.mutate(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No matches yet"
                    description="Add skills to your profile so we can match you to roles."
                  />
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-elevated border-border/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bookmark className="size-4 text-primary" /> Saved jobs
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/candidate/jobs">Browse</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.savedJobs.length ? (
                      data.savedJobs.map((job) => (
                        <Link
                          key={job.id}
                          to="/candidate/jobs/$jobId"
                          params={{ jobId: job.id }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{job.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">
                            {candidateService.formatSalary(job)}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <EmptyState
                        icon={Bookmark}
                        title="Nothing saved"
                        description="Bookmark roles to compare them later."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-border/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Briefcase className="size-4 text-primary" /> Recent applications
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/candidate/applications">Track all</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.applications.slice(0, 4).map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{application.jobTitle}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {application.company}
                          </p>
                        </div>
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                    ))}
                    {!data.applications.length && (
                      <EmptyState
                        icon={Briefcase}
                        title="No applications yet"
                        description="Apply to your first role to start tracking progress."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-elevated border-border/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="size-4 text-primary" /> Upcoming interviews
                    </CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/candidate/interviews">Open</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcoming.length ? (
                      upcoming.map((interview) => (
                        <div key={interview.id} className="rounded-xl border border-border/70 p-3">
                          <p className="text-sm font-semibold">{interview.round}</p>
                          <p className="text-xs text-muted-foreground">
                            {interview.company} ·{" "}
                            {new Date(interview.scheduledAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        icon={CalendarClock}
                        title="No interviews scheduled"
                        description="They'll appear here as recruiters book time with you."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="size-4 text-primary" /> Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.notifications.map((notification, index) => (
                      <div key={notification.id}>
                        {index > 0 && <Separator className="mb-3" />}
                        <p className="text-sm font-semibold">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-block size-1.5 rounded-full bg-primary align-middle" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }}
      </AsyncSection>
    </CandidatePage>
  );
}
