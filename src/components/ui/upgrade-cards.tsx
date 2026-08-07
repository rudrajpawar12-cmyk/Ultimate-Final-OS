import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { cn } from "@/lib/utils";

export function FeatureLockedCard({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={cn("border-dashed bg-muted/40", className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-background text-muted-foreground shadow-sm">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            <PremiumBadge />
          </div>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        {action ?? (
          <Button variant="premium" asChild>
            <Link to="/pricing">Unlock with Pro</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function UpgradeCard({
  title = "Go further with CareerOS Pro",
  description = "Unlimited AI resume rewrites, deep match insights, and priority visibility with recruiters.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "shadow-elevated overflow-hidden border-primary/20 bg-primary-soft/60",
        className,
      )}
    >
      <CardContent className="space-y-4 p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="w-full">
          <Link to="/pricing">View plans</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
