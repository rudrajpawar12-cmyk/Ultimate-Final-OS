import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { Progress } from "@/components/ui/progress";
import type { AutoSaveStatus, OnboardingStepMeta } from "@/types/onboarding";
import { cn } from "@/lib/utils";

/* ------------------------------ Auto save chip ----------------------------- */

export function AutoSaveIndicator({
  status,
  onRetry,
}: {
  status: AutoSaveStatus;
  onRetry: () => void;
}) {
  if (status === "idle") {
    return (
      <span className="text-xs text-muted-foreground" aria-live="polite">
        Progress saves automatically
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex items-center gap-2 text-xs font-medium text-destructive" role="alert">
        <AlertCircle className="size-3.5" aria-hidden="true" />
        Couldn&apos;t save
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
          <RefreshCw className="size-3" aria-hidden="true" />
          Retry
        </Button>
      </span>
    );
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        status === "saving" ? "text-muted-foreground" : "text-success",
      )}
    >
      {status === "saving" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="size-3.5" aria-hidden="true" />
      )}
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

/* -------------------------------- Stepper --------------------------------- */

function Stepper<TId extends string>({
  steps,
  activeIndex,
  completedSteps,
  onSelect,
}: {
  steps: readonly OnboardingStepMeta<TId>[];
  activeIndex: number;
  completedSteps: TId[];
  onSelect: (id: TId) => void;
}) {
  return (
    <nav aria-label="Onboarding steps">
      <ol className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {steps.map((step, index) => {
          const done = completedSteps.includes(step.id);
          const active = index === activeIndex;
          const reachable = done || index <= activeIndex;
          return (
            <li key={step.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => reachable && onSelect(step.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                    done
                      ? "border-success bg-success/12 text-success"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* --------------------------------- Shell ---------------------------------- */

interface OnboardingShellProps<TId extends string> {
  workspace: string;
  steps: readonly OnboardingStepMeta<TId>[];
  activeIndex: number;
  completedSteps: TId[];
  meta: OnboardingStepMeta<TId>;
  progress: number;
  autoSave: AutoSaveStatus;
  error: string | null;
  isFirst: boolean;
  canSkip: boolean;
  hideFooter?: boolean;
  isResetting?: boolean;
  onSelectStep: (id: TId) => void;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
  onRetrySave: () => void;
  onRestart: () => void;
  children: ReactNode;
}

export function OnboardingShell<TId extends string>({
  workspace,
  steps,
  activeIndex,
  completedSteps,
  meta,
  progress,
  autoSave,
  error,
  isFirst,
  canSkip,
  hideFooter,
  isResetting,
  onSelectStep,
  onPrevious,
  onSkip,
  onNext,
  onRetrySave,
  onRestart,
  children,
}: OnboardingShellProps<TId>) {
  return (
    <div className="min-h-dvh bg-muted/25 pb-14 pt-6 sm:pt-10">
      <PageContainer size="wide">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-3">
            <AutoSaveIndicator status={autoSave} onRetry={onRetrySave} />
            <Button variant="ghost" size="sm" onClick={onRestart} disabled={isResetting}>
              {isResetting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Start over
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {workspace} setup
              </p>
              <p className="text-sm text-muted-foreground">
                Step {activeIndex + 1} of {steps.length}
              </p>
              <Progress value={progress} aria-label="Onboarding progress" />
            </div>
            <Stepper
              steps={steps}
              activeIndex={activeIndex}
              completedSteps={completedSteps}
              onSelect={onSelectStep}
            />
          </aside>

          <main>
            <Card className="border-border/70 shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">{meta.title}</CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={meta.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-6"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>

            {!hideFooter && (
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={onPrevious} disabled={isFirst}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  {canSkip && (
                    <Button variant="ghost" onClick={onSkip}>
                      Skip for now
                    </Button>
                  )}
                  <Button onClick={onNext} className="flex-1 sm:flex-none">
                    Save &amp; continue
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </PageContainer>
    </div>
  );
}
