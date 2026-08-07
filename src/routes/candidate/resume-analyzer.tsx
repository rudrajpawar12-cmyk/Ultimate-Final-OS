import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAnalyses, useAnalyzeResume } from "@/hooks/use-candidate";
import { useResumeAnalysis } from "@/hooks/useResumeAnalysis";
import { useResumesList } from "@/hooks/use-resumes";
import type { AnalysisOutcome } from "@/types/candidate";
import type { ResumeAnalysisResult } from "@/types/resume-analysis";

export const Route = createFileRoute("/candidate/resume-analyzer")({
  head: () => ({
    meta: [
      { title: "AI resume analyzer — CareerOS" },
      { name: "description", content: "Score your resume, see ATS readiness and fix gaps fast." },
      { property: "og:title", content: "AI resume analyzer — CareerOS" },
      {
        property: "og:description",
        content: "Overall score, ATS score, strengths, gaps and fixes.",
      },
    ],
  }),
  component: AnalyzerPage,
});

/**
 * Maps a ResumeAnalysisResult from the new hook into the shape expected
 * by the existing UI (matching the legacy ResumeAnalysis interface).
 */
function mapAnalysisResultToUi(result: ResumeAnalysisResult) {
  return {
    id: result.id,
    resumeId: result.resumeId,
    createdAt: result.createdAt,
    overallScore: result.overallScore,
    atsScore: result.atsScore,
    breakdown: result.breakdown.map((dim) => ({
      label: dim.label,
      score: dim.score,
      summary: dim.summary,
    })),
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    missingSkills: result.keywords.missing,
    suggestions: result.suggestions.map((s) => s.description),
  };
}

function AnalyzerPage() {
  const resumes = useResumesList();
  const analyses = useAnalyses();
  const analyze = useAnalyzeResume();
  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null);

  const active = resumes.data?.find((resume) => resume.isActive) ?? resumes.data?.[0];

  // Pass active resume ID so the hook loads the latest persisted analysis on mount
  const resumeAnalysis = useResumeAnalysis({ resumeId: active?.id ?? null });

  // Prefer the result from the new useResumeAnalysis hook if available,
  // then fall back to the legacy outcome, then to the latest from history.
  const mappedNewAnalysis = resumeAnalysis.analysis
    ? mapAnalysisResultToUi(resumeAnalysis.analysis)
    : null;
  const legacyLatest = outcome?.kind === "ok" ? outcome.analysis : analyses.data?.[0];
  const latest = mappedNewAnalysis ?? legacyLatest;

  // Determine if either analysis path is in-flight
  const isPending = analyze.isPending || resumeAnalysis.loading;

  function run() {
    if (!active) return;
    // Use the new useResumeAnalysis hook as the primary analysis path
    void resumeAnalysis.analyzeResume(active.id).then((result) => {
      // Refresh the persisted latest after a successful new analysis
      if (result) {
        void resumeAnalysis.refreshLatest();
      }
    });
    // Also trigger the legacy mutation to keep history in sync
    analyze.mutate(active.id, { onSuccess: setOutcome });
  }

  return (
    <CandidatePage
      title="AI resume analyzer"
      description="Upload, process, analyze — then act on the gaps."
      actions={
        <Button onClick={run} disabled={!active || isPending}>
          <Sparkles className="size-4" />
          {isPending ? "Analyzing…" : "Run analysis"}
        </Button>
      }
    >
      {isPending && (
        <Card className="shadow-elevated border-border/70">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-medium">Processing {active?.originalFileName}</p>
            <Progress value={66} />
            <p className="text-xs text-muted-foreground">
              Parsing sections, extracting skills, scoring ATS.
            </p>
          </CardContent>
        </Card>
      )}

      {!isPending && resumeAnalysis.error && (
        <ErrorState
          title="Analysis failed"
          description={resumeAnalysis.error.message}
          onRetry={run}
        />
      )}

      {!isPending && !resumeAnalysis.error && outcome?.kind === "unavailable" && (
        <ErrorState
          title="AI is temporarily unavailable"
          description={outcome.message}
          onRetry={run}
        />
      )}
      {!isPending && !resumeAnalysis.error && outcome?.kind === "insufficient-data" && (
        <EmptyState icon={AlertTriangle} title="Not enough data" description={outcome.message} />
      )}

      <AsyncSection
        isLoading={analyses.isLoading || resumes.isLoading}
        isError={analyses.isError}
        data={latest}
        onRetry={() => void analyses.refetch()}
        skeleton={<ListSkeleton count={3} />}
        emptyTitle="No analysis yet"
        emptyDescription="Run your first analysis to see scores and suggestions."
        isEmpty={() => !latest}
      >
        {(analysis) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <ScoreCard label="Overall score" value={analysis.overallScore} />
              <ScoreCard label="ATS score" value={analysis.atsScore} />
            </div>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Breakdown</CardTitle>
                <CardDescription>Skills, experience, projects and achievements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.breakdown.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.score}</span>
                    </div>
                    <Progress value={item.score} />
                    <p className="text-xs text-muted-foreground">{item.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <ListCard title="Strengths" items={analysis.strengths} />
              <ListCard title="Weaknesses" items={analysis.weaknesses} />
            </div>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Missing skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="rounded-full">
                    {skill}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <ListCard title="Suggestions" items={analysis.suggestions} />

            <Card className="shadow-elevated border-border/70">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Analysis history</CardTitle>
                <Button variant="ghost" size="sm" onClick={run} disabled={isPending}>
                  <RefreshCw className="size-4" /> Retry
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyses.data ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold">
                      {item.overallScore} overall · {item.atsScore} ATS
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </AsyncSection>
    </CandidatePage>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-elevated border-border/70">
      <CardContent className="space-y-3 p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-5xl font-bold tracking-tight">{value}</p>
        <Progress value={value} />
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={`No ${title.toLowerCase()}`} />
        )}
      </CardContent>
    </Card>
  );
}
