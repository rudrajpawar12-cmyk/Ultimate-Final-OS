import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, GraduationCap } from "lucide-react";
import { useState } from "react";

import { AiSkillRoadmapCard } from "@/components/ai/career-ai-panels";
import { AsyncSection } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useSkillGap } from "@/hooks/use-candidate";

export const Route = createFileRoute("/candidate/skill-gap")({
  head: () => ({
    meta: [
      { title: "Skill gap analysis — CareerOS" },
      {
        name: "description",
        content: "Compare your skills against a target role and get a focused learning plan.",
      },
      { property: "og:title", content: "Skill gap analysis — CareerOS" },
      {
        property: "og:description",
        content: "See matching skills, missing skills and recommended courses.",
      },
    ],
  }),
  component: SkillGapPage,
});

const TARGET_ROLES = [
  "Senior Frontend Engineer",
  "Full Stack Engineer",
  "Backend Engineer",
  "Product Designer",
  "Data Analyst",
];

const priorityVariant = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

function SkillGapPage() {
  const [role, setRole] = useState(TARGET_ROLES[0]);
  const query = useSkillGap(role);

  return (
    <CandidatePage
      title="Skill gap"
      description="Understand what stands between you and your target role."
    >
      <Card className="shadow-elevated border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Target role</CardTitle>
          <CardDescription>Analysis updates instantly when you change the role.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-1.5">
          <Label htmlFor="target-role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="target-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <AiSkillRoadmapCard targetRole={role ?? ""} />

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
        emptyTitle="No analysis available"
        emptyDescription="Add more skills to your profile to generate a gap analysis."
      >
        {(gap) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Role match" value={`${gap.matchScore}%`} />
              <StatCard label="Matching skills" value={gap.matching.length} />
              <StatCard label="Skills to build" value={gap.missing.length} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Your strengths</CardTitle>
                  <CardDescription>Skills already aligned with {gap.targetRole}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gap.matching.length ? (
                    gap.matching.map((skill) => (
                      <div key={skill.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{skill.name}</span>
                          <span className="text-muted-foreground">{skill.level}%</span>
                        </div>
                        <Progress value={skill.level} aria-label={`${skill.name} proficiency`} />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No overlapping skills detected yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Skills to build</CardTitle>
                  <CardDescription>Ordered by hiring demand.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gap.missing.length ? (
                    gap.missing.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {skill.demand}% of postings ask for this
                          </p>
                        </div>
                        <Badge variant={priorityVariant[skill.priority]} className="capitalize">
                          {skill.priority}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You already cover every core skill for this role.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-elevated border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Recommended learning</CardTitle>
                <CardDescription>Close the highest-impact gaps first.</CardDescription>
              </CardHeader>
              <CardContent>
                {gap.recommendations.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {gap.recommendations.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 rounded-xl border border-border/70 p-4"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                          <GraduationCap className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.provider} · {item.hours}h · {item.skill}
                          </p>
                          {item.url && (
                            <Button asChild variant="link" size="sm" className="h-auto px-0 pt-1">
                              <a href={item.url} target="_blank" rel="noreferrer">
                                Open course
                                <ExternalLink className="size-3" aria-hidden="true" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recommendations right now — you're on track.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </AsyncSection>
    </CandidatePage>
  );
}
