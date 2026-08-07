import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_LABEL } from "@/services/candidate.service";
import type { ApplicationStatus, InterviewStatus } from "@/types/candidate";
import { cn } from "@/lib/utils";

const statusTone: Record<ApplicationStatus, string> = {
  applied: "bg-muted text-muted-foreground ring-border",
  "under-review": "bg-primary-soft text-primary ring-primary/25",
  shortlisted: "bg-primary-soft text-primary ring-primary/30",
  interview: "bg-premium/15 text-premium-foreground ring-premium/30 dark:text-premium",
  offer: "bg-success/12 text-success ring-success/30",
  rejected: "bg-destructive/10 text-destructive ring-destructive/25",
  withdrawn: "bg-muted text-muted-foreground ring-border",
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        statusTone[status],
        className,
      )}
    >
      {APPLICATION_STATUS_LABEL[status]}
    </span>
  );
}

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const label =
    status === "scheduled" ? "Scheduled" : status === "completed" ? "Completed" : "Cancelled";
  const variant =
    status === "scheduled" ? "default" : status === "completed" ? "secondary" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
