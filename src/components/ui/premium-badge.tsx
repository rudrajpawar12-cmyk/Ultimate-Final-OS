import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function PremiumBadge({ label = "Pro", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-premium/15 px-2.5 py-0.5 text-xs font-semibold text-premium-foreground ring-1 ring-inset ring-premium/40 dark:text-premium",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
