import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn("focus-ring flex items-center gap-2.5 rounded-md", className)}
      aria-label="CareerOS home"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
          <path
            d="M12 2.5 4.5 7v10L12 21.5 19.5 17V7L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 14.5 12 8l3.5 6.5M9.9 12.9h4.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Career<span className="text-primary">OS</span>
        </span>
      )}
    </Link>
  );
}
