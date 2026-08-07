import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AsyncSection, CardGridSkeleton } from "@/components/candidate/async-section";
import { JobCard } from "@/components/recruiter/job-card";
import { RecruiterPage } from "@/components/recruiter/recruiter-page";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteJob,
  useDuplicateJob,
  useJobStatusMutation,
  useJobs,
} from "@/hooks/use-hiring";
import { hiringService, JOB_STATUS_LABEL } from "@/services/hiring.service";
import type { JobStatus } from "@/types/hiring";

export const Route = createFileRoute("/recruiter/jobs/")({
  head: () => ({
    meta: [
      { title: "Job management — CareerOS" },
      {
        name: "description",
        content: "Create, publish and manage every open role from one hiring workspace.",
      },
      { property: "og:title", content: "Job management — CareerOS" },
      { property: "og:description", content: "Draft, active, closed and archived roles." },
    ],
  }),
  component: JobsPage,
});

const STATUSES: (JobStatus | "all")[] = ["all", "draft", "active", "paused", "closed", "archived"];

function JobsPage() {
  const jobs = useJobs();
  const navigate = useNavigate();
  const duplicate = useDuplicateJob();
  const status = useJobStatusMutation();
  const remove = useDeleteJob();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [department, setDepartment] = useState("all");
  const [sort, setSort] = useState<"recent" | "applicants" | "title">("recent");

  return (
    <RecruiterPage
      title="Jobs"
      description="Every role you're hiring for, from first draft to archived."
      actions={
        <Button onClick={() => void navigate({ to: "/recruiter/jobs/new" })}>
          <Plus className="size-4" /> Create job
        </Button>
      }
    >
      <AsyncSection
        isLoading={jobs.isLoading}
        isError={jobs.isError}
        data={jobs.data}
        onRetry={() => void jobs.refetch()}
        skeleton={<CardGridSkeleton count={6} />}
        emptyTitle="No jobs yet"
        emptyDescription="Create your first role to start collecting applicants."
        emptyAction={
          <Button asChild>
            <Link to="/recruiter/jobs/new">Create job</Link>
          </Button>
        }
        isEmpty={(data) => data.length === 0}
      >
        {(data) => {
          const counts = hiringService.jobStatusCounts(data);
          const filtered = hiringService.filterJobs(data, {
            query,
            status: statusFilter,
            department,
            sort,
          });

          return (
            <div className="space-y-5">
              <Tabs
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as JobStatus | "all")}
              >
                <TabsList className="flex-wrap">
                  {STATUSES.map((item) => (
                    <TabsTrigger key={item} value={item}>
                      {item === "all" ? "All" : JOB_STATUS_LABEL[item]} ({counts[item] ?? 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <SearchBar
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search jobs, skills or locations…"
                  label="Search jobs"
                />
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-11 w-full sm:w-48" aria-label="Filter by department">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {hiringService.departments(data).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(value) => setSort(value as "recent" | "applicants" | "title")}
                >
                  <SelectTrigger className="h-11 w-full sm:w-44" aria-label="Sort jobs">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently updated</SelectItem>
                    <SelectItem value="applicants">Most applicants</SelectItem>
                    <SelectItem value="title">Title A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
                  No jobs match these filters.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      actions={{
                        onDuplicate: (item) => duplicate.mutate(item.id),
                        onStatus: (item, next) => status.mutate({ id: item.id, status: next }),
                        onDelete: (item) => remove.mutate(item.id),
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </AsyncSection>
    </RecruiterPage>
  );
}