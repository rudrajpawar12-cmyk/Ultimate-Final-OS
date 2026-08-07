import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, Building2, MapPin, Wallet } from "lucide-react";

import { AiJobMatchCard } from "@/components/ai/career-ai-panels";
import { AsyncSection } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { MatchBadge } from "@/components/candidate/match-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplications,
  useApplyToJob,
  useJob,
  useResumes,
  useToggleSavedJob,
} from "@/hooks/use-candidate";
import { candidateService } from "@/services/candidate.service";

export const Route = createFileRoute("/candidate/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job details — CareerOS" },
      {
        name: "description",
        content: "Role description, requirements, match breakdown and one-click apply.",
      },
      { property: "og:title", content: "Job details — CareerOS" },
      { property: "og:description", content: "See how well you match this role and apply." },
    ],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const query = useJob(jobId);
  const applications = useApplications();
  const apply = useApplyToJob();
  const toggleSave = useToggleSavedJob();
  const resumes = useResumes();
  const [resumeId, setResumeId] = useState<string | undefined>(undefined);

  // Default to the candidate's active resume once the list resolves.
  useEffect(() => {
    if (resumeId || !resumes.data?.length) return;
    const active =
      resumes.data.find((resume) => resume.status === "active") ?? resumes.data[0];
    setResumeId(active?.id);
  }, [resumes.data, resumeId]);

  const alreadyApplied = applications.data?.some((item) => item.jobId === jobId) ?? false;

  return (
    <CandidatePage
      title={query.data?.title ?? "Job details"}
      description={query.data ? `${query.data.company} · ${query.data.location}` : undefined}
      breadcrumbs={[
        { label: "Candidate", to: "/candidate" },
        { label: "Jobs", to: "/candidate/jobs" },
        { label: query.data?.title ?? "Job" },
      ]}
      actions={
        <Button asChild variant="ghost">
          <Link to="/candidate/jobs">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to jobs
          </Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data ?? undefined}
        onRetry={() => void query.refetch()}
        errorTitle="We couldn't load this role"
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        }
      >
        {(job) => (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card className="shadow-elevated border-border/70">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-base font-bold text-primary">
                      {job.companyInitials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold tracking-tight">{job.title}</h2>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="size-3.5" aria-hidden="true" />
                        {job.company}
                      </p>
                    </div>
                    <MatchBadge score={job.matchScore} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {job.location}
                      {job.remote && " · Remote"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Wallet className="size-3.5" aria-hidden="true" />
                      {candidateService.formatSalary(job)}
                    </span>
                    <span>{job.experience}</span>
                    <Badge variant="secondary" className="capitalize">
                      {job.type.replace("-", " ")}
                    </Badge>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="rounded-full">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailList title="Responsibilities" items={job.responsibilities} />
                <DetailList title="Requirements" items={job.requirements} />
                <DetailList title="Benefits" items={job.benefits} />
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Your match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={job.matchScore} aria-label="Match score" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Matching skills
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.matchingSkills.length ? (
                        job.matchingSkills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="rounded-full">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">None detected yet.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Skills to build
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.missingSkills.length ? (
                        job.missingSkills.map((skill) => (
                          <Badge key={skill} variant="outline" className="rounded-full">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          You cover every listed skill.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {!alreadyApplied && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Resume to send
                        </p>
                        {resumes.data?.length ? (
                          <Select value={resumeId} onValueChange={setResumeId}>
                            <SelectTrigger aria-label="Select resume">
                              <SelectValue placeholder="Choose a resume" />
                            </SelectTrigger>
                            <SelectContent>
                              {resumes.data.map((resume) => (
                                <SelectItem key={resume.id} value={resume.id}>
                                  {resume.fileName} · v{resume.version}
                                  {resume.status === "active" ? " (active)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <Link className="underline" to="/candidate/resume">
                              Upload a resume
                            </Link>{" "}
                            to apply with your best version.
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      disabled={alreadyApplied || apply.isPending}
                      onClick={() => apply.mutate({ jobId: job.id, resumeId })}
                    >
                      {alreadyApplied
                        ? "Already applied"
                        : apply.isPending
                          ? "Submitting…"
                          : "Apply now"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={toggleSave.isPending}
                      onClick={() => toggleSave.mutate(job.id)}
                    >
                      {job.saved ? (
                        <BookmarkCheck className="size-4" aria-hidden="true" />
                      ) : (
                        <Bookmark className="size-4" aria-hidden="true" />
                      )}
                      {job.saved ? "Saved" : "Save job"}
                    </Button>
                    {alreadyApplied && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/candidate/applications">Track application</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <AiJobMatchCard jobId={job.id} />
            </aside>
          </div>
        )}
      </AsyncSection>
    </CandidatePage>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
