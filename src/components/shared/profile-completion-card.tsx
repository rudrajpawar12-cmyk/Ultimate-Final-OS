import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleDashed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CompletionReport } from "@/types/onboarding";
import { cn } from "@/lib/utils";

/**
 * Reusable profile completion widget.
 * Fed by the completion engine in the service layer, so candidate and
 * recruiter dashboards share one component.
 */
export function ProfileCompletionCard({
  report,
  continueTo,
  title = "Profile completion",
  className,
}: {
  report: CompletionReport;
  continueTo: "/candidate/onboarding" | "/recruiter/onboarding";
  title?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {report.complete
            ? "Everything is filled in — your profile is working at full strength."
            : `${report.percentage}% complete — finish these to improve your results.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={report.percentage} aria-label={`${report.percentage}% complete`} />

        <ul className="space-y-2">
          {report.sections.map((section) => (
            <li key={section.id} className="flex items-start gap-2 text-sm">
              {section.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <CircleDashed
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className={cn(section.done ? "text-muted-foreground" : "font-medium")}>
                {section.label}
                {!section.done && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {section.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {report.next && (
          <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm">
            <p className="font-semibold text-primary">Recommended next step</p>
            <p className="mt-0.5 text-muted-foreground">
              {report.next.label} — {report.next.hint}
            </p>
          </div>
        )}

        {!report.complete && (
          <Button asChild className="w-full">
            <Link to={continueTo}>
              Continue profile
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
