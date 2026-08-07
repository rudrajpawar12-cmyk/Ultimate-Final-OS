import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AsyncSection, CardGridSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { JobCard } from "@/components/candidate/job-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobs, useToggleSavedJob } from "@/hooks/use-candidate";
import { defaultJobFilters } from "@/services/candidate.service";
import type { JobFilters } from "@/types/candidate";

export const Route = createFileRoute("/candidate/jobs/")({
  head: () => ({
    meta: [
      { title: "Job search — CareerOS" },
      {
        name: "description",
        content: "Search matched roles, filter by location, salary and work mode, and save jobs.",
      },
      { property: "og:title", content: "Job search — CareerOS" },
      {
        property: "og:description",
        content: "Personalised job matches with filters, match scores and saved roles.",
      },
    ],
  }),
  component: JobSearchPage,
});

const LOCATIONS = ["any", "Bengaluru", "Hyderabad", "Pune", "Delhi NCR", "Remote"];
const EXPERIENCE = ["any", "0-2 years", "2-4 years", "3-6 years", "5-8 years", "8+ years"];

function JobSearchPage() {
  const [filters, setFilters] = useState<JobFilters>(defaultJobFilters);
  const [view, setView] = useState<"all" | "saved">("all");
  const query = useJobs(filters);
  const toggleSave = useToggleSavedJob();

  const update = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const isFiltered = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(defaultJobFilters),
    [filters],
  );

  return (
    <CandidatePage
      title="Jobs"
      description="Roles matched to your profile, skills and preferences."
      actions={
        isFiltered ? (
          <Button variant="outline" onClick={() => setFilters(defaultJobFilters)}>
            Reset filters
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-elevated">
        <SearchBar
          label="Search jobs"
          placeholder="Search by role, company or skill…"
          value={filters.query}
          onValueChange={(value) => update("query", value)}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="job-location">Location</Label>
            <Select value={filters.location} onValueChange={(value) => update("location", value)}>
              <SelectTrigger id="job-location">
                <SelectValue placeholder="Any location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location === "any" ? "Any location" : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-experience">Experience</Label>
            <Select
              value={filters.experience}
              onValueChange={(value) => update("experience", value)}
            >
              <SelectTrigger id="job-experience">
                <SelectValue placeholder="Any experience" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === "any" ? "Any experience" : level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-sort">Sort by</Label>
            <Select
              value={filters.sort}
              onValueChange={(value) => update("sort", value as JobFilters["sort"])}
            >
              <SelectTrigger id="job-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Best match</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="salary">Highest salary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex h-10 items-center gap-2">
              <Switch
                id="job-remote"
                checked={filters.remoteOnly}
                onCheckedChange={(checked) => update("remoteOnly", checked)}
              />
              <Label htmlFor="job-remote" className="cursor-pointer">
                Remote only
              </Label>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as "all" | "saved")}>
        <TabsList>
          <TabsTrigger value="all">All matches</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
      </Tabs>

      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<CardGridSkeleton count={6} />}
        isEmpty={(jobs) => (view === "saved" ? jobs.filter((j) => j.saved) : jobs).length === 0}
        emptyTitle={view === "saved" ? "No saved jobs yet" : "No jobs match those filters"}
        emptyDescription={
          view === "saved"
            ? "Save roles you like and they'll appear here."
            : "Try widening your location, experience or salary filters."
        }
        emptyAction={
          view === "all" && isFiltered ? (
            <Button variant="outline" onClick={() => setFilters(defaultJobFilters)}>
              Reset filters
            </Button>
          ) : undefined
        }
      >
        {(jobs) => {
          const visible = view === "saved" ? jobs.filter((job) => job.saved) : jobs;
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {visible.length} {visible.length === 1 ? "role" : "roles"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onToggleSave={(id) => toggleSave.mutate(id)}
                    isSaving={toggleSave.isPending}
                  />
                ))}
              </div>
            </div>
          );
        }}
      </AsyncSection>
    </CandidatePage>
  );
}
