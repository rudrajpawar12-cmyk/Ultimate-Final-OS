import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AsyncSection, CardGridSkeleton } from "@/components/candidate/async-section";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { MatchScoreBadge, ResumeScoreBadge } from "@/components/recruiter/score-badge";
import { StageBadge } from "@/components/recruiter/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplicants, useBulkApplicantStageMutation } from "@/hooks/use-hiring";
import { hiringService, PIPELINE_STAGES, PIPELINE_STAGE_LABEL } from "@/services/hiring.service";
import type { Applicant, PipelineStage } from "@/types/hiring";

export const Route = createFileRoute("/recruiter/applicants")({
  head: () => ({
    meta: [
      { title: "Applicants — CareerOS" },
      { name: "description", content: "Search, filter and review every applicant in one place." },
      { property: "og:title", content: "Applicants — CareerOS" },
      { property: "og:description", content: "Grid, table and list views with AI scoring." },
    ],
  }),
  component: ApplicantsPage,
});

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  return (
    <Card className="shadow-elevated border-border/70">
      <CardContent className="space-y-3 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <Link
              to="/recruiter/candidates/$candidateId"
              params={{ candidateId: applicant.id }}
              className="focus-ring block truncate rounded font-semibold hover:text-primary"
            >
              {applicant.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">{applicant.headline}</p>
          </div>
          <StageBadge stage={applicant.stage} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MatchScoreBadge score={applicant.ai.matchScore} />
          <ResumeScoreBadge score={applicant.ai.resumeScore} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {applicant.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="outline" className="rounded-full">
              {skill}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {applicant.experienceYears} yrs · {applicant.jobTitle} · applied{" "}
          {hiringService.relativeTime(applicant.appliedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

function ApplicantsPage() {
  const applicants = useApplicants();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<PipelineStage | "all">("all");
  const [sort, setSort] = useState<"recent" | "match" | "resume" | "name">("match");
  const [view, setView] = useState<"grid" | "table" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const bulkStage = useBulkApplicantStageMutation();

  const toggleSelected = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const moveSelected = (nextStage: PipelineStage) => {
    bulkStage.mutate({ ids: selected, stage: nextStage }, { onSuccess: () => setSelected([]) });
  };

  return (
    <RecruiterPage title="Applicants" description="Every candidate across your open roles.">
      <AsyncSection
        isLoading={applicants.isLoading}
        isError={applicants.isError}
        data={applicants.data}
        onRetry={() => void applicants.refetch()}
        skeleton={<CardGridSkeleton count={6} />}
        emptyTitle="No applicants yet"
        isEmpty={(data) => data.length === 0}
      >
        {(data) => {
          const filtered = hiringService.filterApplicants(data, { query, stage, sort });
          return (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <SearchBar
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search candidates or skills…"
                  label="Search applicants"
                />
                <Select
                  value={stage}
                  onValueChange={(value) => setStage(value as PipelineStage | "all")}
                >
                  <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {PIPELINE_STAGES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {PIPELINE_STAGE_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(value) =>
                    setSort(value as "recent" | "match" | "resume" | "name")
                  }
                >
                  <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Sort applicants">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match">Best AI match</SelectItem>
                    <SelectItem value="resume">Resume score</SelectItem>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
                <TabsList>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>


              {view === "table" && selected.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm font-medium">{selected.length} selected</p>
                  <Select
                    value=""
                    onValueChange={(value) => moveSelected(value as PipelineStage)}
                    disabled={bulkStage.isPending}
                  >
                    <SelectTrigger className="h-9 w-48" aria-label="Move selected to stage">
                      <SelectValue placeholder="Move to stage…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {PIPELINE_STAGE_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                    Clear
                  </Button>
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
                  No candidates match these filters.
                </p>
              ) : view === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((applicant) => (
                    <ApplicantCard key={applicant.id} applicant={applicant} />
                  ))}
                </div>
              ) : view === "list" ? (
                <ul className="space-y-3">
                  {filtered.map((applicant) => (
                    <li key={applicant.id}>
                      <ApplicantCard applicant={applicant} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[760px] text-sm">
                    <caption className="sr-only">Applicants</caption>
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th scope="col" className="p-3">
                          <Checkbox
                            aria-label="Select all applicants"
                            checked={
                              filtered.length > 0 && selected.length === filtered.length
                            }
                            onCheckedChange={(checked) =>
                              setSelected(checked ? filtered.map((item) => item.id) : [])
                            }
                          />
                        </th>
                        <th scope="col" className="p-3 font-semibold">Candidate</th>
                        <th scope="col" className="p-3 font-semibold">Role</th>
                        <th scope="col" className="p-3 font-semibold">Experience</th>
                        <th scope="col" className="p-3 font-semibold">Resume</th>
                        <th scope="col" className="p-3 font-semibold">AI match</th>
                        <th scope="col" className="p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((applicant) => (
                        <tr key={applicant.id} className="border-t border-border">
                          <td className="p-3">
                            <Checkbox
                              aria-label={`Select ${applicant.name}`}
                              checked={selected.includes(applicant.id)}
                              onCheckedChange={() => toggleSelected(applicant.id)}
                            />
                          </td>
                          <td className="p-3">
                            <Link
                              to="/recruiter/candidates/$candidateId"
                              params={{ candidateId: applicant.id }}
                              className="focus-ring rounded font-medium hover:text-primary"
                            >
                              {applicant.name}
                            </Link>
                          </td>
                          <td className="p-3 text-muted-foreground">{applicant.jobTitle}</td>
                          <td className="p-3 text-muted-foreground">
                            {applicant.experienceYears} yrs
                          </td>
                          <td className="p-3">{applicant.ai.resumeScore}</td>
                          <td className="p-3">{applicant.ai.matchScore}%</td>
                          <td className="p-3">
                            <StageBadge stage={applicant.stage} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }}
      </AsyncSection>
    </RecruiterPage>
  );
}
