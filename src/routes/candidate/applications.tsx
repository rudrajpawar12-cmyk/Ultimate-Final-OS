import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { ApplicationStatusBadge } from "@/components/candidate/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplications, useWithdrawApplication } from "@/hooks/use-candidate";
import { APPLICATION_STATUS_LABEL, candidateService } from "@/services/candidate.service";
import type { Application, ApplicationStatus } from "@/types/candidate";

export const Route = createFileRoute("/candidate/applications")({
  head: () => ({
    meta: [
      { title: "Applications — CareerOS" },
      {
        name: "description",
        content: "Track every application, its stage, timeline and next action in one place.",
      },
      { property: "og:title", content: "Applications — CareerOS" },
      { property: "og:description", content: "A live tracker for every role you've applied to." },
    ],
  }),
  component: ApplicationsPage,
});

const FILTERS: { value: "all" | ApplicationStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "under-review", label: "Under review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

function ApplicationsPage() {
  const query = useApplications();
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const withdraw = useWithdrawApplication();

  return (
    <CandidatePage
      title="Applications"
      description="Every role you've applied to, with live stage tracking."
      actions={
        <Button asChild variant="outline">
          <Link to="/candidate/jobs">Find more roles</Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<ListSkeleton count={4} />}
        isEmpty={(items) => items.length === 0}
        emptyTitle="No applications yet"
        emptyDescription="Apply to a matched role and track its progress here."
        emptyAction={
          <Button asChild>
            <Link to="/candidate/jobs">Browse jobs</Link>
          </Button>
        }
      >
        {(applications) => {
          const funnel = candidateService.applicationFunnel(applications);
          const inInterview = applications.filter((a) => a.status === "interview").length;
          const offers = applications.filter((a) => a.status === "offer").length;
          const active = applications.filter((a) => a.status !== "rejected").length;

          const visible = applications.filter((application) => {
            const matchesFilter = filter === "all" || application.status === filter;
            const term = search.trim().toLowerCase();
            const matchesSearch =
              !term ||
              application.jobTitle.toLowerCase().includes(term) ||
              application.company.toLowerCase().includes(term);
            return matchesFilter && matchesSearch;
          });

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total applications" value={applications.length} />
                <StatCard label="Active" value={active} />
                <StatCard label="In interview" value={inInterview} />
                <StatCard label="Offers" value={offers} />
              </div>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Funnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {funnel.map((step) => (
                    <div key={step.status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{step.label}</span>
                        <span className="text-muted-foreground">{step.count}</span>
                      </div>
                      <Progress
                        value={applications.length ? (step.count / applications.length) * 100 : 0}
                        aria-label={`${step.label} count`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Tabs
                  value={filter}
                  onValueChange={(value) => setFilter(value as "all" | ApplicationStatus)}
                  className="min-w-0"
                >
                  <TabsList className="flex-wrap">
                    {FILTERS.map((item) => (
                      <TabsTrigger key={item.value} value={item.value}>
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <SearchBar
                  label="Search applications"
                  placeholder="Search role or company…"
                  value={search}
                  onValueChange={setSearch}
                  className="lg:max-w-xs"
                />
              </div>

              {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
                  No applications match this filter.
                </p>
              ) : (
                <ul className="space-y-3">
                  {visible.map((application) => (
                    <li key={application.id}>
                      <Card className="shadow-elevated border-border/70">
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate font-semibold">{application.jobTitle}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {application.company} · applied{" "}
                              {new Date(application.appliedAt).toLocaleDateString()}
                            </p>
                            <Progress
                              className="mt-2 max-w-sm"
                              value={candidateService.statusProgress(application.status)}
                              aria-label={`${application.jobTitle} progress`}
                            />
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <ApplicationStatusBadge status={application.status} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelected(application)}
                            >
                              Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </AsyncSection>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.jobTitle}</SheetTitle>
            <SheetDescription>{selected?.company}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 px-4 pb-8">
              <div className="flex items-center gap-2">
                <ApplicationStatusBadge status={selected.status} />
                <span className="text-sm text-muted-foreground">
                  Applied {new Date(selected.appliedAt).toLocaleDateString()}
                </span>
              </div>

              {selected.nextAction && (
                <div className="rounded-xl bg-primary-soft p-3 text-sm text-primary">
                  Next: {selected.nextAction}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold">Timeline</h3>
                <ol className="mt-3 space-y-4 border-l border-border pl-4">
                  {selected.timeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary"
                      />
                      <p className="text-sm font-medium">
                        {APPLICATION_STATUS_LABEL[event.status]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {selected.notes && (
                <div>
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link to="/candidate/jobs/$jobId" params={{ jobId: selected.jobId }}>
                  View role
                </Link>
              </Button>

              {selected.status !== "withdrawn" &&
                selected.status !== "rejected" &&
                selected.status !== "offer" && (
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    disabled={withdraw.isPending}
                    onClick={() => {
                      withdraw.mutate(selected.id, {
                        onSuccess: (application) => setSelected(application),
                      });
                    }}
                  >
                    {withdraw.isPending ? "Withdrawing…" : "Withdraw application"}
                  </Button>
                )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </CandidatePage>
  );
}
