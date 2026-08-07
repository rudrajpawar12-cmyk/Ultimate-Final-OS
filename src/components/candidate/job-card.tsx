import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Building2, MapPin, Wallet } from "lucide-react";

import { MatchBadge } from "@/components/candidate/match-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { candidateService } from "@/services/candidate.service";
import type { Job } from "@/types/candidate";
import { cn } from "@/lib/utils";

export function JobCard({
  job,
  onToggleSave,
  isSaving,
  className,
}: {
  job: Job;
  onToggleSave?: (id: string) => void;
  isSaving?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "shadow-elevated border-border/70 transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
            {job.companyInitials}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to="/candidate/jobs/$jobId"
              params={{ jobId: job.id }}
              className="line-clamp-1 font-semibold text-foreground hover:underline"
            >
              {job.title}
            </Link>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" aria-hidden="true" />
              <span className="truncate">{job.company}</span>
            </p>
          </div>
          {onToggleSave && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={job.saved ? "Remove from saved jobs" : "Save job"}
              disabled={isSaving}
              onClick={() => onToggleSave(job.id)}
            >
              {job.saved ? (
                <BookmarkCheck className="size-4 text-primary" />
              ) : (
                <Bookmark className="size-4" />
              )}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {job.location}
            {job.remote && " · Remote"}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="size-3.5" aria-hidden="true" />
            {candidateService.formatSalary(job)}
          </span>
          <span>{job.experience}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="rounded-full font-medium">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <MatchBadge score={job.matchScore} />
          <Button asChild size="sm" variant="outline">
            <Link to="/candidate/jobs/$jobId" params={{ jobId: job.id }}>
              View role
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
