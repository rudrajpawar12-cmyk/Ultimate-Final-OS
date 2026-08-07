import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrepOverview, useTogglePracticed } from "@/hooks/use-candidate";

export const Route = createFileRoute("/candidate/interview-prep")({
  head: () => ({
    meta: [
      { title: "Interview preparation — CareerOS" },
      {
        name: "description",
        content: "Practice technical and behavioural questions and track your readiness.",
      },
      { property: "og:title", content: "Interview preparation — CareerOS" },
      { property: "og:description", content: "A focused practice plan before every round." },
    ],
  }),
  component: InterviewPrepPage,
});

const difficultyVariant = {
  easy: "secondary",
  medium: "default",
  hard: "destructive",
} as const;

function InterviewPrepPage() {
  const query = usePrepOverview();
  const toggle = useTogglePracticed();
  const [tab, setTab] = useState<"all" | "technical" | "behavioral">("all");

  return (
    <CandidatePage
      title="Interview preparation"
      description="Practice the questions most likely to come up in your next round."
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<ListSkeleton count={5} />}
        isEmpty={(data) => data.questions.length === 0}
        emptyTitle="No practice questions yet"
        emptyDescription="Complete your profile so we can tailor questions to your target roles."
      >
        {(data) => {
          const visible =
            tab === "all"
              ? data.questions
              : data.questions.filter((question) => question.category === tab);

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Readiness" value={`${data.progress.readiness}%`} />
                <StatCard
                  label="Practiced"
                  value={`${data.progress.practiced}/${data.progress.total}`}
                />
                <StatCard label="Suggested topics" value={data.suggestedTopics.length} />
              </div>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Overall readiness</CardTitle>
                  <CardDescription>
                    Based on the questions you've marked as practiced.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={data.progress.readiness} aria-label="Interview readiness" />
                </CardContent>
              </Card>

              {data.suggestedTopics.length > 0 && (
                <Card className="shadow-elevated border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">Focus topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {data.suggestedTopics.map((topic) => (
                        <li key={topic.topic} className="rounded-xl border border-border/70 p-4">
                          <p className="text-sm font-semibold">{topic.topic}</p>
                          <p className="text-xs text-muted-foreground">{topic.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as typeof tab)}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="behavioral">Behavioural</TabsTrigger>
                </TabsList>
              </Tabs>

              {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
                  No questions in this category yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {visible.map((question) => (
                    <li key={question.id}>
                      <Card className="shadow-elevated border-border/70">
                        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="font-medium">{question.question}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{question.topic}</Badge>
                              <Badge
                                variant={difficultyVariant[question.difficulty]}
                                className="capitalize"
                              >
                                {question.difficulty}
                              </Badge>
                              {question.practiced && (
                                <span className="text-xs font-semibold text-success">
                                  Practiced
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={question.practiced ? "secondary" : "outline"}
                            size="sm"
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate(question.id)}
                          >
                            {question.practiced ? "Mark unpracticed" : "Mark practiced"}
                          </Button>
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
    </CandidatePage>
  );
}
