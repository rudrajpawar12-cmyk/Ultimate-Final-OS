import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AiApplicantReviewCard } from "@/components/ai/career-ai-panels";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { MatchScoreBadge } from "@/components/recruiter/score-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { useAiRanking, useApplicants, useJobs, useScreeningQuestions } from "@/hooks/use-hiring";

export const Route = createFileRoute("/recruiter/ai")({
  head: () => ({
    meta: [
      { title: "AI hiring workspace — CareerOS" },
      { name: "description", content: "AI candidate ranking, screening questions and summaries." },
      { property: "og:title", content: "AI hiring workspace — CareerOS" },
      { property: "og:description", content: "Rank candidates and draft screening material." },
    ],
  }),
  component: AiWorkspacePage,
});

function AiWorkspacePage() {
  const jobs = useJobs();
  const ranking = useAiRanking();
  const questions = useScreeningQuestions();
  const applicants = useApplicants();
  const [brief, setBrief] = useState("");
  const [jobId, setJobId] = useState("");
  const [applicantId, setApplicantId] = useState("");

  // Applicants for the selected role, so the review always matches the pipeline.
  const jobApplicants = (applicants.data ?? []).filter(
    (applicant) => !jobId || applicant.jobId === jobId,
  );
  const selectedApplicant = jobApplicants.find((applicant) => applicant.id === applicantId) ?? null;

  const firstJobId = jobs.data?.[0]?.id ?? "";
  useEffect(() => {
    if (!jobId && firstJobId) setJobId(firstJobId);
  }, [firstJobId, jobId]);

  const result = ranking.data;

  return (
    <RecruiterPage
      title="AI hiring workspace"
      description="Ranked candidates and generated screening material."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="shadow-elevated border-border/70">
            <CardHeader className="gap-3">
              <CardTitle>AI candidate ranking</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger className="w-full sm:w-64" aria-label="Select a role to rank">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs.data ?? []).map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!jobId || ranking.isPending}
                  onClick={() => ranking.mutate(jobId)}
                >
                  {ranking.isPending ? "Ranking…" : "Run AI ranking"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ranking.isPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : !result ? (
                <EmptyState
                  title="No ranking yet"
                  description="Pick a role and run the AI ranking to see the strongest candidates."
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                  <ol className="space-y-3">
                    {result.rankings.map((item, index) => (
                      <li
                        key={item.applicantId}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-muted/40 p-3"
                      >
                        <span className="text-sm font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.jobTitle} · {item.recommendation}
                          </p>
                        </div>
                        <MatchScoreBadge score={item.fitScore} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elevated border-border/70 h-fit">
          <CardHeader>
            <CardTitle>Generate screening questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="sr-only" htmlFor="brief">
              Role brief
            </label>
            <Textarea
              id="brief"
              rows={4}
              value={brief}
              placeholder="Describe the role focus…"
              onChange={(event) => setBrief(event.target.value)}
            />
            <Button
              className="w-full"
              disabled={!jobId || questions.isPending}
              onClick={() => questions.mutate({ jobId, brief })}
            >
              {questions.isPending ? "Generating…" : "Generate questions"}
            </Button>
            {questions.data?.length ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {questions.data.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                Questions are generated for the role selected above.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-3">
          <Select
            value={applicantId}
            onValueChange={setApplicantId}
            disabled={jobApplicants.length === 0}
          >
            <SelectTrigger className="w-full sm:w-80" aria-label="Select an applicant to review">
              <SelectValue
                placeholder={
                  jobApplicants.length === 0 ? "No applicants for this role" : "Select an applicant"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {jobApplicants.map((applicant) => (
                <SelectItem key={applicant.id} value={applicant.id}>
                  {applicant.name} · {applicant.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AiApplicantReviewCard
            applicationId={applicantId || null}
            {...(selectedApplicant ? { applicantName: selectedApplicant.name } : {})}
          />
        </div>
      </div>
    </RecruiterPage>
  );
}
