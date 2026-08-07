import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MapPin, Phone, Video } from "lucide-react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { InterviewStatusBadge } from "@/components/candidate/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { useInterviews } from "@/hooks/use-candidate";
import { candidateService } from "@/services/candidate.service";
import type { Interview } from "@/types/candidate";

export const Route = createFileRoute("/candidate/interviews")({
  head: () => ({
    meta: [
      { title: "Interview schedule — CareerOS" },
      {
        name: "description",
        content: "Upcoming and past interviews with round, mode, interviewer and feedback.",
      },
      { property: "og:title", content: "Interview schedule — CareerOS" },
      { property: "og:description", content: "Never miss an interview round again." },
    ],
  }),
  component: InterviewsPage,
});

const modeIcon = { video: Video, phone: Phone, onsite: MapPin } as const;

function InterviewsPage() {
  const query = useInterviews();

  return (
    <CandidatePage
      title="Interviews"
      description="Your upcoming rounds and past interview history."
      actions={
        <Button asChild variant="outline">
          <Link to="/candidate/interview-prep">Prepare</Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<ListSkeleton count={3} />}
        isEmpty={(items) => items.length === 0}
        emptyTitle="No interviews scheduled"
        emptyDescription="Interviews appear here as soon as a recruiter schedules a round."
        emptyAction={
          <Button asChild>
            <Link to="/candidate/applications">Track applications</Link>
          </Button>
        }
      >
        {(interviews) => {
          const { upcoming, past } = candidateService.splitInterviews(interviews);
          const upcomingList = upcoming as Interview[];
          const pastList = past as Interview[];

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Upcoming" value={upcomingList.length} icon={CalendarClock} />
                <StatCard label="Completed" value={pastList.length} />
                <StatCard label="Total rounds" value={interviews.length} />
              </div>

              <section aria-labelledby="upcoming-interviews" className="space-y-3">
                <h2 id="upcoming-interviews" className="text-sm font-semibold">
                  Upcoming
                </h2>
                {upcomingList.length ? (
                  <ul className="space-y-3">
                    {upcomingList.map((interview) => (
                      <InterviewRow key={interview.id} interview={interview} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-8 text-center text-sm text-muted-foreground">
                    Nothing scheduled right now.
                  </p>
                )}
              </section>

              <section aria-labelledby="past-interviews" className="space-y-3">
                <h2 id="past-interviews" className="text-sm font-semibold">
                  Past
                </h2>
                {pastList.length ? (
                  <ul className="space-y-3">
                    {pastList.map((interview) => (
                      <InterviewRow key={interview.id} interview={interview} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-8 text-center text-sm text-muted-foreground">
                    No past interviews yet.
                  </p>
                )}
              </section>
            </div>
          );
        }}
      </AsyncSection>
    </CandidatePage>
  );
}

function InterviewRow({ interview }: { interview: Interview }) {
  const Icon = modeIcon[interview.mode];
  const when = new Date(interview.scheduledAt);

  return (
    <li>
      <Card className="shadow-elevated border-border/70">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{interview.jobTitle}</p>
            <p className="truncate text-sm text-muted-foreground">
              {interview.company} · {interview.round}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {when.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {interview.durationMinutes} min · {interview.interviewer}
            </p>
            {interview.feedback && (
              <p className="mt-2 rounded-lg bg-muted/60 p-2 text-sm text-muted-foreground">
                {interview.feedback}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <InterviewStatusBadge status={interview.status} />
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
