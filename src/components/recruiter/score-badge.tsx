import { FileText, Sparkles } from "lucide-react";

import { hiringService } from "@/services/hiring.service";
import { cn } from "@/lib/utils";

function toneClass(score: number) {
  const tone = hiringService.scoreTone(score);
  return tone === "high"
    ? "bg-success/12 text-success ring-success/30"
    : tone === "medium"
      ? "bg-primary-soft text-primary ring-primary/25"
      : "bg-muted text-muted-foreground ring-border";
}

export function MatchScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClass(score),
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {score}% AI match
    </span>
  );
}

export function ResumeScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClass(score),
        className,
      )}
    >
      <FileText className="size-3" aria-hidden="true" />
      Resume {score}
    </span>
  );
}