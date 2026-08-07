/**
 * Presentation components for the CareerOS AI engine.
 *
 * Every panel is generated on demand, renders the engine's score explanation
 * ("why / how it was calculated / how to improve"), and shows whether the
 * payload came from the cache. Failures render the engine's own message.
 */

import { AlertTriangle, ExternalLink, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicantReview,
  useCareerRecommendations,
  useJobMatch,
  useSkillGap,
} from "@/hooks/use-career-ai";
import type { AnalysisMeta, Priority, ScoreExplanation } from "@/types/career-ai";

const priorityVariant: Record<Priority, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function Explanation({ explanation, meta }: { explanation: ScoreExplanation; meta: AnalysisMeta }) {
  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
      <p>
        <span className="font-semibold">Why: </span>
        {explanation.why}
      </p>
      <p>
        <span className="font-semibold">How it was calculated: </span>
        {explanation.howCalculated}
      </p>
      <p>
        <span className="font-semibold">How to improve: </span>
        {explanation.howToImprove}
      </p>
      <p className="text-xs text-muted-foreground">
        {meta.cached ? "Cached result" : "Freshly generated"} ·{" "}
        {new Date(meta.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function EngineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ChipList({ label, items, variant }: { label: string; items: string[]; variant: "secondary" | "outline" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant={variant} className="rounded-full">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Job match --------------------------------- */

/** AI match breakdown for one job, generated from the candidate's real profile. */
export function AiJobMatchCard({ jobId }: { jobId: string }) {
  const { match, loading, error, analyze } = useJobMatch(jobId);

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI match analysis
        </CardTitle>
        <CardDescription>
          Scores your profile, resume and projects against this role.
        </CardDescription>
        <div className="flex gap-2">
          <Button size="sm" disabled={loading} onClick={() => void analyze()}>
            {loading ? "Analysing…" : match ? "Re-check" : "Run AI analysis"}
          </Button>
          {match && (
            <Button size="sm" variant="ghost" disabled={loading} onClick={() => void analyze(true)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <EngineError message={error.message} />}
        {loading && !match && <LoadingRows rows={4} />}
        {match && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold">{match.matchScore}%</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {match.verdict} match
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full capitalize">
                {match.verdict}
              </Badge>
            </div>
            <Progress value={match.matchScore} aria-label="AI match score" />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Experience", dimension: match.experienceMatch },
                { label: "Education", dimension: match.educationMatch },
                { label: "Location", dimension: match.locationMatch },
              ].map(({ label, dimension }) => (
                <div key={label} className="rounded-xl border border-border/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-lg font-semibold">{dimension.score}%</p>
                  <p className="text-xs text-muted-foreground">{dimension.summary}</p>
                </div>
              ))}
            </div>

            <ChipList label="Matching skills" items={match.matchingSkills} variant="secondary" />
            <ChipList label="Missing skills" items={match.missingSkills} variant="outline" />
            <ChipList
              label="Transferable skills"
              items={match.transferableSkills}
              variant="outline"
            />

            {match.projectEvidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Project evidence
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {match.projectEvidence.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Strengths
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {match.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gaps
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {match.gaps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm">{match.recommendation}</p>
            <Explanation explanation={match.explanation} meta={match.meta} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Skill gap --------------------------------- */

/** AI learning roadmap toward a target role. */
export function AiSkillRoadmapCard({ targetRole }: { targetRole: string }) {
  const { analysis, loading, error, analyze } = useSkillGap();

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI learning roadmap
        </CardTitle>
        <CardDescription>
          A sequenced plan from your current skills to {targetRole}.
        </CardDescription>
        <div className="flex gap-2">
          <Button size="sm" disabled={loading} onClick={() => void analyze(targetRole)}>
            {loading ? "Building…" : analysis ? "Rebuild plan" : "Generate roadmap"}
          </Button>
          {analysis && (
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => void analyze(targetRole, null, true)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <EngineError message={error.message} />}
        {loading && !analysis && <LoadingRows rows={4} />}
        {analysis && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role match</p>
                <p className="text-2xl font-semibold">{analysis.matchScore}%</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Skills to build
                </p>
                <p className="text-2xl font-semibold">{analysis.missingSkills.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Learning hours
                </p>
                <p className="text-2xl font-semibold">{analysis.totalLearningHours}</p>
              </div>
            </div>

            <ChipList label="Strong skills" items={analysis.strongSkills} variant="secondary" />

            {analysis.missingSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gaps
                </p>
                {analysis.missingSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.why}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {skill.difficulty} · ~{skill.estimatedHours}h · demand {skill.demand}%
                      </p>
                    </div>
                    <Badge variant={priorityVariant[skill.priority]} className="capitalize">
                      {skill.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <ol className="space-y-3">
              {analysis.roadmap.map((step) => (
                <li key={`${step.order}-${step.title}`} className="rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {step.order}. {step.title}
                    </p>
                    <span className="text-xs text-muted-foreground">~{step.estimatedHours}h</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  {step.resources.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {step.resources.map((resource) => (
                        <li key={`${resource.provider}-${resource.title}`}>
                          {resource.url ? (
                            <a
                              className="focus-ring inline-flex items-center gap-1 rounded underline"
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {resource.title} · {resource.provider}
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">
                              {resource.title} · {resource.provider}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            {analysis.recommendedTechnologies.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Technologies to learn
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {analysis.recommendedTechnologies.map((item) => (
                    <li key={item.name}>
                      <span className="font-medium text-foreground">{item.name}</span> — {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Explanation explanation={analysis.explanation} meta={analysis.meta} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------- Career recommendations ------------------------- */

/** Career paths, role fit, salary bands and a technology roadmap. */
export function AiCareerRecommendationsCard() {
  const { recommendations, loading, error, generate } = useCareerRecommendations();

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI career recommendations
        </CardTitle>
        <CardDescription>
          Roles, paths, salary bands and technologies based on your profile and the live job board.
        </CardDescription>
        <div className="flex gap-2">
          <Button size="sm" disabled={loading} onClick={() => void generate()}>
            {loading ? "Thinking…" : recommendations ? "Regenerate" : "Generate recommendations"}
          </Button>
          {recommendations && (
            <Button size="sm" variant="ghost" disabled={loading} onClick={() => void generate(true)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <EngineError message={error.message} />}
        {loading && !recommendations && <LoadingRows rows={5} />}
        {recommendations && (
          <>
            <p className="text-sm font-medium">{recommendations.headline}</p>

            {recommendations.recommendedJobs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended roles
                </p>
                {recommendations.recommendedJobs.map((job) => (
                  <div
                    key={`${job.title}-${job.company}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {job.title} · {job.company}
                      </p>
                      <p className="text-xs text-muted-foreground">{job.reason}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {job.matchScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {recommendations.careerPaths.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.careerPaths.map((path) => (
                  <div key={path.title} className="rounded-xl bg-muted/40 p-4">
                    <p className="text-sm font-semibold">{path.title}</p>
                    <p className="text-xs text-muted-foreground">{path.horizon}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                      {path.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="mt-2 text-xs text-muted-foreground">{path.rationale}</p>
                  </div>
                ))}
              </div>
            )}

            {recommendations.roleSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Role readiness
                </p>
                {recommendations.roleSuggestions.map((role) => (
                  <div key={role.title} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{role.title}</span>
                      <span className="text-muted-foreground">{role.readiness}%</span>
                    </div>
                    <Progress value={role.readiness} aria-label={`${role.title} readiness`} />
                    <p className="text-xs text-muted-foreground">{role.why}</p>
                  </div>
                ))}
              </div>
            )}

            {recommendations.salaryInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Salary insights
                </p>
                {recommendations.salaryInsights.map((insight) => (
                  <div key={insight.role} className="rounded-xl border border-border/70 p-3 text-sm">
                    <p className="font-medium">{insight.role}</p>
                    <p className="text-muted-foreground">
                      {insight.currency} {insight.min.toLocaleString()} –{" "}
                      {insight.max.toLocaleString()} (median {insight.median.toLocaleString()})
                    </p>
                    <p className="text-xs text-muted-foreground">{insight.basis}</p>
                  </div>
                ))}
              </div>
            )}

            {recommendations.technologyRoadmap.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {recommendations.technologyRoadmap.map((phase) => (
                  <div key={phase.phase} className="rounded-xl border border-border/70 p-3">
                    <p className="text-sm font-semibold">{phase.phase}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {phase.technologies.map((tech) => (
                        <Badge key={tech} variant="outline" className="rounded-full">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{phase.outcome}</p>
                  </div>
                ))}
              </div>
            )}

            <Explanation explanation={recommendations.explanation} meta={recommendations.meta} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Recruiter review ---------------------------- */

/** Recruiter-facing AI review of a single application. */
export function AiApplicantReviewCard({
  applicationId,
  applicantName,
}: {
  applicationId: string | null;
  applicantName?: string;
}) {
  const { review, loading, error, generate } = useApplicantReview();

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI applicant review
        </CardTitle>
        <CardDescription>
          Resume summary, ranking, red flags, interview questions and assessments
          {applicantName ? ` for ${applicantName}` : ""}.
        </CardDescription>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={loading || !applicationId}
            onClick={() => applicationId && void generate(applicationId)}
          >
            {loading ? "Reviewing…" : review ? "Re-review" : "Run AI review"}
          </Button>
          {review && applicationId && (
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => void generate(applicationId, true)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <EngineError message={error.message} />}
        {loading && !review && <LoadingRows rows={5} />}
        {review && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold">{review.rankingScore}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ranking score
                </p>
              </div>
              <Badge
                variant={
                  review.recommendation.decision === "advance"
                    ? "default"
                    : review.recommendation.decision === "hold"
                      ? "secondary"
                      : "destructive"
                }
                className="rounded-full capitalize"
              >
                {review.recommendation.decision}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{review.resumeSummary}</p>
            <p className="text-sm">{review.recommendation.rationale}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Strengths
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {review.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Weaknesses
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {review.weaknesses.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {review.redFlags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Red flags
                </p>
                {review.redFlags.map((flag) => (
                  <div
                    key={flag.title}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{flag.title}</p>
                      <p className="text-xs text-muted-foreground">{flag.detail}</p>
                    </div>
                    <Badge variant={priorityVariant[flag.severity]} className="capitalize">
                      {flag.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {review.cultureFitNotes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Culture fit notes
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {review.cultureFitNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {review.interviewQuestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Interview questions
                </p>
                <ol className="space-y-2">
                  {review.interviewQuestions.map((item) => (
                    <li key={item.question} className="rounded-xl bg-muted/40 p-3 text-sm">
                      <p className="font-medium">{item.question}</p>
                      <p className="text-xs text-muted-foreground">
                        Focus: {item.focus} · Look for: {item.lookFor}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {review.technicalAssessments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested assessments
                </p>
                {review.technicalAssessments.map((assessment) => (
                  <div key={assessment.title} className="rounded-xl border border-border/70 p-3">
                    <p className="text-sm font-medium">
                      {assessment.title} · {assessment.durationMinutes} min
                    </p>
                    <p className="text-xs text-muted-foreground">{assessment.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {assessment.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="rounded-full">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Explanation explanation={review.explanation} meta={review.meta} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
