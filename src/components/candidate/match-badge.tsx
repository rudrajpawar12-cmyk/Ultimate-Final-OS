import { Sparkles } from "lucide-react";

import { candidateService } from "@/services/candidate.service";
import { cn } from "@/lib/utils";

export function MatchBadge({ score, className }: { score: number; className?: string }) {
  const tone = candidateService.matchTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tone === "high" && "bg-success/12 text-success ring-success/30",
        tone === "medium" && "bg-primary-soft text-primary ring-primary/25",
        tone === "low" && "bg-muted text-muted-foreground ring-border",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {score}% match
    </span>
  );
}
