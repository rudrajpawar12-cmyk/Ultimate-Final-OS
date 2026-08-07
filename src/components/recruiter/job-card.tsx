import { Link } from "@tanstack/react-router";
import {
  Archive,
  Briefcase,
  Copy,
  MapPin,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { JobStatusBadge } from "@/components/recruiter/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { hiringService } from "@/services/hiring.service";
import type { Job, JobStatus } from "@/types/hiring";

export interface JobCardActions {
  onDuplicate: (job: Job) => void;
  onStatus: (job: Job, status: JobStatus) => void;
  onDelete: (job: Job) => void;
}

export function JobCard({ job, actions }: { job: Job; actions: JobCardActions }) {
  const progress = hiringService.hiringProgress(job);

  return (
    <Card className="shadow-elevated border-border/70 transition-shadow hover:shadow-lg">
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              to="/recruiter/jobs/$jobId"
              params={{ jobId: job.id }}
              className="focus-ring block truncate rounded text-base font-semibold text-foreground hover:text-primary"
            >
              {job.title}
            </Link>
            <p className="truncate text-sm text-muted-foreground">
              {job.department} · {job.employmentType}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <JobStatusBadge status={job.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${job.title}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/recruiter/jobs/$jobId" params={{ jobId: job.id }}>
                    <Pencil className="size-4" /> Edit job
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.onDuplicate(job)}>
                  <Copy className="size-4" /> Duplicate
                </DropdownMenuItem>
                {job.status !== "active" && (
                  <DropdownMenuItem onSelect={() => actions.onStatus(job, "active")}>
                    <Send className="size-4" /> Publish
                  </DropdownMenuItem>
                )}
                {job.status === "active" && (
                  <DropdownMenuItem onSelect={() => actions.onStatus(job, "paused")}>
                    <Send className="size-4" /> Pause
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => actions.onStatus(job, "archived")}>
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => actions.onDelete(job)}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
  <span className="inline-flex items-center gap-1.5">
    <MapPin className="size-3.5" />
    {job.location}
  </span>

  <span className="inline-flex items-center gap-1.5 capitalize">
    <Briefcase className="size-3.5" />
    {job.workMode}
  </span>

  <span className="inline-flex items-center gap-1.5">
    <Users className="size-3.5" />
    {job.applicantCount} Applicants
  </span>

  <Badge variant="secondary">
    {job.interviewCount} Interviews
  </Badge>

  <Badge variant="secondary">
    {job.offerCount} Offers
  </Badge>

  <Badge variant="secondary">
    {job.hiredCount} Hired
  </Badge>

  <Badge variant="outline">
    👁 {job.views} Views
  </Badge>
</div>

        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="outline" className="rounded-full font-medium">
              {skill}
            </Badge>
          ))}
          {job.skills.length > 4 && (
            <Badge variant="outline" className="rounded-full font-medium">
              +{job.skills.length - 4}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Hiring progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} aria-label={`Hiring progress for ${job.title}`} />
        </div>

        <p className="text-xs text-muted-foreground">
          {hiringService.formatSalary(job)} · updated {hiringService.relativeTime(job.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}