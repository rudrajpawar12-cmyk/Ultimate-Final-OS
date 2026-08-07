import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AsyncSection } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { MatchScoreBadge, ResumeScoreBadge } from "@/components/recruiter/score-badge";
import { StageBadge } from "@/components/recruiter/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddApplicantNote,
  useAddApplicantTag,
  useApplicant,
  useApplicantStageMutation,
  useRemoveApplicantTag,
} from "@/hooks/use-hiring";
import { hiringService, PIPELINE_STAGE_LABEL } from "@/services/hiring.service";

export const Route = createFileRoute("/recruiter/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Candidate profile — CareerOS" },
      { name: "description", content: "Resume, AI scoring and hiring actions for this candidate." },
      { property: "og:title", content: "Candidate profile — CareerOS" },
      { property: "og:description", content: "Experience, skills, AI match and notes." },
    ],
  }),
  component: CandidateProfilePage,
});

function CandidateProfilePage() {
  const { candidateId } = Route.useParams();
  const applicant = useApplicant(candidateId);
  const stage = useApplicantStageMutation();
  const addNote = useAddApplicantNote();
  const addTag = useAddApplicantTag();
  const removeTag = useRemoveApplicantTag();
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");

  return (
    <RecruiterPage
      title={applicant.data?.name ?? "Candidate"}
      description={applicant.data?.headline}
      breadcrumbs={[
        { label: "Recruiter", to: "/recruiter" },
        { label: "Applicants", to: "/recruiter/applicants" },
        { label: applicant.data?.name ?? "Candidate" },
      ]}
      actions={
        applicant.data ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => stage.mutate({ id: candidateId, stage: "shortlisted" })}
            >
              Shortlist
            </Button>
            <Button
              variant="outline"
              onClick={() => stage.mutate({ id: candidateId, stage: "interview" })}
            >
              Schedule interview
            </Button>
            <Button
              variant="outline"
              onClick={() => stage.mutate({ id: candidateId, stage: "rejected" })}
            >
              Reject
            </Button>
          </div>
        ) : undefined
      }
    >
      <AsyncSection
        isLoading={applicant.isLoading}
        isError={applicant.isError}
        data={applicant.data ?? undefined}
        onRetry={() => void applicant.refetch()}
      >
        {(data) => (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="shadow-elevated border-border/70">
                <CardHeader className="flex-row flex-wrap items-center gap-2">
                  <CardTitle>Resume preview</CardTitle>
                  <StageBadge stage={data.stage} />
                  <Button variant="ghost" size="sm" className="ml-auto">
                    Download {data.resumeFileName}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <section>
                    <h3 className="mb-2 font-semibold">Experience</h3>
                    <ul className="space-y-3">
                      {data.experience.map((item) => (
                        <li key={item.id}>
                          <p className="font-medium">
                            {item.title} · {item.company}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.period}</p>
                          <p className="text-muted-foreground">{item.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="mb-2 font-semibold">Education</h3>
                    {data.education.map((item) => (
                      <p key={item.id} className="text-muted-foreground">
                        {item.degree} — {item.school} ({item.period})
                      </p>
                    ))}
                  </section>
                  <section>
                    <h3 className="mb-2 font-semibold">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="rounded-full">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 font-semibold">Projects & certifications</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      {data.projects.map((item) => (
                        <li key={item.id}>
                          {item.name} — {item.description}
                        </li>
                      ))}
                      {data.certifications.map((item) => (
                        <li key={item.id}>
                          {item.name} — {item.issuer}, {item.year}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="mb-2 font-semibold">Portfolio & links</h3>
                    <ul className="space-y-1">
                      {[
                        ...(data.portfolioUrl
                          ? [{ label: "Portfolio", url: data.portfolioUrl }]
                          : []),
                        ...data.socials,
                      ].map((link) => (
                        <li key={link.url}>
                          <a
                            className="focus-ring rounded text-primary underline-offset-4 hover:underline"
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="sr-only" htmlFor="note">
                    Add a note
                  </label>
                  <Textarea
                    id="note"
                    rows={3}
                    value={note}
                    placeholder="Add an interview or screening note…"
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <Button
                    disabled={!note.trim() || addNote.isPending}
                    onClick={() =>
                      addNote.mutate(
                        { id: candidateId, body: note.trim() },
                        { onSuccess: () => setNote("") },
                      )
                    }
                  >
                    Add note
                  </Button>
                  <ul className="space-y-3 text-sm">
                    {data.notes.map((item) => (
                      <li key={item.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="font-medium">{item.author}</p>
                        <p className="text-muted-foreground">{item.body}</p>
                        <p className="text-xs text-muted-foreground">
                          {hiringService.formatDate(item.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(data.tags ?? []).length ? (
                      (data.tags ?? []).map((item) => (
                        <Badge key={item} variant="secondary" className="rounded-full">
                          {item}
                          <button
                            type="button"
                            aria-label={`Remove tag ${item}`}
                            className="focus-ring ml-1 rounded"
                            onClick={() => removeTag.mutate({ id: candidateId, tag: item })}
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags yet</span>
                    )}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!tag.trim()) return;
                      addTag.mutate(
                        { id: candidateId, tag: tag.trim() },
                        { onSuccess: () => setTag("") },
                      );
                    }}
                  >
                    <label className="sr-only" htmlFor="tag">
                      Add a tag
                    </label>
                    <Input
                      id="tag"
                      value={tag}
                      placeholder="e.g. senior, remote-ok"
                      onChange={(event) => setTag(event.target.value)}
                    />
                    <Button type="submit" disabled={!tag.trim() || addTag.isPending}>
                      Add tag
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle>Pipeline timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {(data.stageHistory ?? []).length ? (
                    <ol className="space-y-3 text-sm">
                      {(data.stageHistory ?? []).map((event) => (
                        <li key={event.id} className="rounded-xl bg-muted/50 p-3">
                          <p className="font-medium">
                            {event.fromStage
                              ? `${PIPELINE_STAGE_LABEL[event.fromStage]} → ${PIPELINE_STAGE_LABEL[event.toStage]}`
                              : `Moved to ${PIPELINE_STAGE_LABEL[event.toStage]}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.actor} · {hiringService.formatDate(event.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Stage changes will appear here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>


            <Card className="shadow-elevated border-border/70 h-fit">
              <CardHeader>
                <CardTitle>AI assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <MatchScoreBadge score={data.ai.matchScore} />
                  <ResumeScoreBadge score={data.ai.resumeScore} />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Strengths</h3>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {data.ai.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Weaknesses</h3>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {data.ai.weaknesses.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Skill gap</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.ai.missingSkills.length ? (
                      data.ai.missingSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="rounded-full">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No gaps detected</span>
                    )}
                  </div>
                </div>
                <p className="rounded-xl bg-primary-soft p-3 text-primary">
                  {data.ai.recommendation}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </AsyncSection>
    </RecruiterPage>
  );
}
