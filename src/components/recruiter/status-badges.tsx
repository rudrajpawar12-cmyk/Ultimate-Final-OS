import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_LABEL, PIPELINE_STAGE_LABEL } from "@/services/hiring.service";
import type { InterviewState, JobStatus, PipelineStage } from "@/types/hiring";
import { cn } from "@/lib/utils";

const jobTone: Record<JobStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/12 text-success",
  paused: "bg-warning/15 text-warning-foreground",
  closed: "bg-destructive/12 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

const stageTone: Record<PipelineStage, string> = {
  applied: "bg-muted text-muted-foreground",
  screening: "bg-primary-soft text-primary",
  shortlisted: "bg-primary-soft text-primary",
  interview: "bg-primary/12 text-primary",
  offer: "bg-success/12 text-success",
  hired: "bg-success/20 text-success",
  rejected: "bg-destructive/12 text-destructive",
};

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-semibold", jobTone[status], className)}>
      {JOB_STATUS_LABEL[status]}
    </Badge>
  );
}

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-semibold", stageTone[stage], className)}>
      {PIPELINE_STAGE_LABEL[stage]}
    </Badge>
  );
}

const interviewTone: Record<InterviewState, string> = {
  scheduled: "bg-primary-soft text-primary",
  completed: "bg-success/12 text-success",
  cancelled: "bg-destructive/12 text-destructive",
};

export function InterviewStateBadge({
  state,
  className,
}: {
  state: InterviewState;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 font-semibold capitalize", interviewTone[state], className)}
    >
      {state}
    </Badge>
  );
}