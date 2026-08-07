import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJob } from "@/hooks/use-hiring";
import { hiringService, JOB_WIZARD_STEPS } from "@/services/hiring.service";
import type { JobDraft } from "@/types/hiring";

export const Route = createFileRoute("/recruiter/jobs/new")({
  head: () => ({
    meta: [
      { title: "Create a job — CareerOS" },
      { name: "description", content: "Multi-step job creation for recruiters." },
      { property: "og:title", content: "Create a job — CareerOS" },
      { property: "og:description", content: "Draft, review and publish a new role." },
    ],
  }),
  component: CreateJobPage,
});

function list(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function CreateJobPage() {
  const navigate = useNavigate();
  const create = useCreateJob();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDraft>(() => hiringService.emptyJobDraft());

  const step = JOB_WIZARD_STEPS[index];
  const patch = (value: Partial<JobDraft>) => setDraft((prev) => ({ ...prev, ...value }));

  const next = () => {
    const message = hiringService.validateWizardStep(step.id, draft);
    setError(message);
    if (!message) setIndex((value) => Math.min(JOB_WIZARD_STEPS.length - 1, value + 1));
  };

  const submit = (status: "draft" | "active") => {
    create.mutate(
      { ...draft, status },
      { onSuccess: () => void navigate({ to: "/recruiter/jobs" }) },
    );
  };

  return (
    <RecruiterPage
      title="Create a job"
      description={`Step ${index + 1} of ${JOB_WIZARD_STEPS.length} — ${step.title}`}
      breadcrumbs={[
        { label: "Recruiter", to: "/recruiter" },
        { label: "Jobs", to: "/recruiter/jobs" },
        { label: "Create" },
      ]}
    >
      <Progress
        value={((index + 1) / JOB_WIZARD_STEPS.length) * 100}
        aria-label="Job creation progress"
      />

      <Card className="shadow-elevated border-border/70">
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>

          {step.id === "basics" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Job title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={draft.department}
                  onChange={(event) => patch({ department: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={draft.location}
                  onChange={(event) => patch({ location: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment type</Label>
                <Input
                  id="employmentType"
                  value={draft.employmentType}
                  onChange={(event) => patch({ employmentType: event.target.value })}
                />
              </div>
            </div>
          )}

          {step.id === "description" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Job overview</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={draft.description}
                  onChange={(event) => patch({ description: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
                <Textarea
                  id="responsibilities"
                  rows={4}
                  value={draft.responsibilities.join("\n")}
                  onChange={(event) => patch({ responsibilities: list(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (one per line)</Label>
                <Textarea
                  id="requirements"
                  rows={4}
                  value={draft.requirements.join("\n")}
                  onChange={(event) => patch({ requirements: list(event.target.value) })}
                />
              </div>
            </div>
          )}

          {step.id === "skills" && (
            <div className="space-y-2">
              <Label htmlFor="skills">Required skills (comma separated)</Label>
              <Input
                id="skills"
                value={draft.skills.join(", ")}
                onChange={(event) =>
                  patch({
                    skills: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          )}

          {step.id === "experience" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expMin">Minimum years</Label>
                <Input
                  id="expMin"
                  type="number"
                  value={draft.experienceMin}
                  onChange={(event) => patch({ experienceMin: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expMax">Maximum years</Label>
                <Input
                  id="expMax"
                  type="number"
                  value={draft.experienceMax}
                  onChange={(event) => patch({ experienceMax: Number(event.target.value) })}
                />
              </div>
            </div>
          )}

          {step.id === "salary" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salMin">Minimum</Label>
                <Input
                  id="salMin"
                  type="number"
                  value={draft.salaryMin}
                  onChange={(event) => patch({ salaryMin: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salMax">Maximum</Label>
                <Input
                  id="salMax"
                  type="number"
                  value={draft.salaryMax}
                  onChange={(event) => patch({ salaryMax: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={draft.salaryCurrency}
                  onChange={(event) => patch({ salaryCurrency: event.target.value.toUpperCase() })}
                />
              </div>
            </div>
          )}

          {step.id === "benefits" && (
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                rows={4}
                value={draft.benefits.join("\n")}
                onChange={(event) => patch({ benefits: list(event.target.value) })}
              />
            </div>
          )}

          {step.id === "team" && (
            <div className="space-y-2">
              <Label htmlFor="team">Hiring team (Name — Role, one per line)</Label>
              <Textarea
                id="team"
                rows={4}
                value={draft.hiringTeam.map((item) => `${item.name} — ${item.role}`).join("\n")}
                onChange={(event) =>
                  patch({
                    hiringTeam: list(event.target.value).map((line, position) => {
                      const [name, role] = line.split("—").map((part) => part.trim());
                      return {
                        id: `team-${position}`,
                        name: name ?? line,
                        role: role ?? "Interviewer",
                        email: "",
                      };
                    }),
                  })
                }
              />
            </div>
          )}

          {step.id === "screening" && (
            <div className="space-y-2">
              <Label htmlFor="screening">Screening questions (one per line)</Label>
              <Textarea
                id="screening"
                rows={4}
                value={draft.screeningQuestions.map((item) => item.question).join("\n")}
                onChange={(event) =>
                  patch({
                    screeningQuestions: list(event.target.value).map((question, position) => ({
                      id: `sq-${position}`,
                      question,
                      type: "text" as const,
                      required: true,
                    })),
                  })
                }
              />
            </div>
          )}

          {step.id === "review" && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium">{draft.title || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Department</dt>
                <dd className="font-medium">{draft.department || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium">{draft.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="font-medium">
                  {draft.experienceMin}–{draft.experienceMax} years
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Salary</dt>
                <dd className="font-medium">{hiringService.formatSalary(draft)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Skills</dt>
                <dd className="font-medium">{draft.skills.join(", ") || "—"}</dd>
              </div>
            </dl>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              Back
            </Button>
            {step.id === "review" ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={create.isPending}
                  onClick={() => submit("draft")}
                >
                  Save as draft
                </Button>
                <Button disabled={create.isPending} onClick={() => submit("active")}>
                  Publish job
                </Button>
              </div>
            ) : (
              <Button onClick={next}>Continue</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </RecruiterPage>
  );
}