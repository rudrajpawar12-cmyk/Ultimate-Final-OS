import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { RecruiterOnboardingStep } from "@/components/onboarding/recruiter-steps";
import { LoadingState } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/states";
import { useOnboardingEngine } from "@/hooks/use-onboarding-engine";
import {
  useRecruiterOnboardingState,
  useResetRecruiterOnboarding,
  useSaveRecruiterOnboarding,
} from "@/hooks/use-recruiter";
import { RECRUITER_ONBOARDING_STEPS, recruiterService } from "@/services/recruiter.service";
import type { RecruiterOnboardingData, RecruiterOnboardingStepId } from "@/types/recruiter";

export const Route = createFileRoute("/recruiter/onboarding")({
  head: () => ({
    meta: [
      { title: "Recruiter onboarding — CareerOS" },
      {
        name: "description",
        content:
          "Set up your CareerOS hiring workspace: company profile, industry and hiring preferences.",
      },
      { property: "og:title", content: "Recruiter onboarding — CareerOS" },
      {
        property: "og:description",
        content: "Guided setup for your CareerOS hiring workspace.",
      },
    ],
  }),
  component: RecruiterOnboardingPage,
});

function RecruiterOnboardingPage() {
  const navigate = useNavigate();
  const query = useRecruiterOnboardingState();
  const save = useSaveRecruiterOnboarding();
  const reset = useResetRecruiterOnboarding();

  const engine = useOnboardingEngine<RecruiterOnboardingStepId, RecruiterOnboardingData>({
    steps: RECRUITER_ONBOARDING_STEPS,
    remoteState: query.data,
    persist: (state) => save.mutateAsync(state),
    resetFlow: () => reset.mutateAsync(),
    validateStep: recruiterService.validateStep,
  });

  /**
   * Completing onboarding only needs to (1) mark the flow "complete" and
   * (2) let that save propagate to the production tables.
   *
   * `useSaveRecruiterOnboarding` already runs `onboardingSyncService.syncRecruiter`
   * as part of every save (see hooks/use-recruiter.ts), which upserts the
   * `recruiters` and `companies` rows from the onboarding data. This handler
   * used to *also* call `useCreateRecruiter` / `useCreateCompany` directly,
   * which insert (not upsert) those same rows. Because the sync above had
   * usually already created them by the time this ran, that second write
   * raced or conflicted with the first — producing duplicate rows or a 409,
   * throwing before `navigate()` ever ran, and leaving the onboarding record
   * stuck at "profile" forever (so the dashboard gate kept bouncing back).
   *
   * Removing the redundant manual create call fixes all of that: there is
   * now exactly one place that writes recruiter/company rows.
   */
  const handleEnterWorkspace = async () => {
    try {
      await save.mutateAsync({
        ...engine.state!,
        currentStep: "complete",
        completedSteps: Array.from(
          new Set<RecruiterOnboardingStepId>([
            ...engine.state!.completedSteps,
            "profile",
            "complete",
          ])
        ),
      });

      toast.success("Recruiter profile created successfully!");

      navigate({
        to: "/recruiter",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't complete onboarding. Please try again.",
      );
    }
  };

  if (query.isError) {
    return (
      <ProtectedRoute role="recruiter">
        <div className="grid min-h-dvh place-items-center px-4">
          <ErrorState
            title="We couldn't load onboarding"
            description="Your saved progress is safe. Retry in a moment."
            onRetry={() => void query.refetch()}
          />
        </div>
      </ProtectedRoute>
    );
  }

  if (query.isLoading || !engine.state) {
    return (
      <ProtectedRoute role="recruiter">
        <div className="grid min-h-dvh place-items-center">
          <LoadingState label="Loading your workspace setup…" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute role="recruiter">
      <OnboardingShell
        workspace="Recruiter"
        steps={RECRUITER_ONBOARDING_STEPS}
        activeIndex={engine.index}
        completedSteps={engine.completedSteps}
        meta={engine.meta}
        progress={engine.progress}
        autoSave={engine.autoSave}
        error={engine.error}
        isFirst={engine.isFirst}
        canSkip={engine.canSkip}
        hideFooter={Boolean(engine.meta.terminal)}
        isResetting={engine.isResetting}
        onSelectStep={(id) => engine.goTo(id, false)}
        onPrevious={engine.previous}
        onSkip={engine.skip}
        onNext={() => engine.next()}
        onRetrySave={engine.retrySave}
        onRestart={() => void engine.restart()}
      >
        <RecruiterOnboardingStep
          step={engine.state.currentStep}
          data={engine.state.data}
          update={engine.update}
          onEnterWorkspace={handleEnterWorkspace}
        />
      </OnboardingShell>
    </ProtectedRoute>
  );
}