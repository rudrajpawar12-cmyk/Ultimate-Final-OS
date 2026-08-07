import { createFileRoute, Link } from "@tanstack/react-router";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { MatchScoreBadge } from "@/components/recruiter/score-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApplicantStageMutation, useApplicants } from "@/hooks/use-hiring";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABEL } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/pipeline")({
  head: () => ({
    meta: [
      { title: "Hiring pipeline — CareerOS" },
      { name: "description", content: "Kanban view of every candidate across hiring stages." },
      { property: "og:title", content: "Hiring pipeline — CareerOS" },
      { property: "og:description", content: "Move candidates between stages at a glance." },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const applicants = useApplicants();
  const stage = useApplicantStageMutation();

  return (
    <RecruiterPage title="Hiring pipeline" description="Track candidates from applied to hired.">
      <AsyncSection
        isLoading={applicants.isLoading}
        isError={applicants.isError}
        data={applicants.data}
        onRetry={() => void applicants.refetch()}
      >
        {(data) => (
          <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-3">
            {PIPELINE_STAGES.map((column) => {
              const items = data.filter((applicant) => applicant.stage === column);
              return (
                <section key={column} className="rounded-2xl border border-border bg-muted/30 p-3">
                  <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                    {PIPELINE_STAGE_LABEL[column]}
                    <span className="text-muted-foreground">{items.length}</span>
                  </h2>
                  <ul className="space-y-3">
                    {items.map((applicant) => {
                      const index = PIPELINE_STAGES.indexOf(applicant.stage);
                      return (
                        <li key={applicant.id}>
                          <Card className="border-border/70">
                            <CardContent className="space-y-2 p-4">
                              <Link
                                to="/recruiter/candidates/$candidateId"
                                params={{ candidateId: applicant.id }}
                                className="focus-ring block truncate rounded font-medium hover:text-primary"
                              >
                                {applicant.name}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">
                                {applicant.jobTitle}
                              </p>
                              <MatchScoreBadge score={applicant.ai.matchScore} />
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={index <= 0}
                                  onClick={() =>
                                    stage.mutate({
                                      id: applicant.id,
                                      stage: PIPELINE_STAGES[index - 1],
                                    })
                                  }
                                >
                                  Back
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={index >= PIPELINE_STAGES.length - 1}
                                  onClick={() =>
                                    stage.mutate({
                                      id: applicant.id,
                                      stage: PIPELINE_STAGES[index + 1],
                                    })
                                  }
                                >
                                  Advance
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </li>
                      );
                    })}
                    {items.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Empty
                      </li>
                    ) : null}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </AsyncSection>
    </RecruiterPage>
  );
}
