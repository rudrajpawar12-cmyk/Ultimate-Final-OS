import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

function StateShell({
  title,
  description,
  icon: Icon,
  action,
  className,
  tone = "muted",
}: StateProps & { tone?: "muted" | "danger" | "success" }) {
  const toneClass =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "success"
        ? "bg-success/12 text-success"
        : "bg-primary-soft text-primary";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className={cn("mb-4 grid size-12 place-items-center rounded-2xl", toneClass)}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = Inbox, ...props }: StateProps) {
  return <StateShell icon={icon} {...props} />;
}

export function SuccessState({ icon = CheckCircle2, ...props }: StateProps) {
  return <StateShell icon={icon} tone="success" {...props} />;
}

export function ErrorState({
  icon = AlertTriangle,
  onRetry,
  ...props
}: StateProps & { onRetry?: () => void }) {
  return (
    <StateShell
      icon={icon}
      tone="danger"
      action={
        props.action ??
        (onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined)
      }
      {...props}
    />
  );
}
