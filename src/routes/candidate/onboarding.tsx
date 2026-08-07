import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { CandidateOnboardingStep } from "@/components/onboarding/candidate-steps";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { LoadingState } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/states";
import { useOnboardingEngine } from "@/hooks/use-onboarding-engine";
import {
  useOnboardingState,
  useResetOnboarding,
  useSaveOnboardingState,
} from "@/hooks/use-candidate";
import { ONBOARDING_STEPS, candidateService } from "@/services/candidate.service";
import type { OnboardingData, OnboardingStepId } from "@/types/candidate";

export const Route = createFileRoute("/candidate/onboarding")({
  head: () => ({
    meta: [
      { title: "Candidate onboarding — CareerOS" },
      {
        name: "description",
        content: "Set up your CareerOS candidate profile in a guided, resumable flow.",
      },
      { property: "og:title", content: "Candidate onboarding — CareerOS" },
      { property: "og:description", content: "A guided setup for your CareerOS career profile." },
    ],
  }),
  component: CandidateOnboardingPage,
});

function CandidateOnboardingPage() {
  const navigate = useNavigate();
  const query = useOnboardingState();
  const save = useSaveOnboardingState();
  const reset = useResetOnboarding();

  const engine = useOnboardingEngine<OnboardingStepId, OnboardingData>({
    steps: ONBOARDING_STEPS,
    remoteState: query.data,
    persist: (state) => save.mutateAsync(state),
    resetFlow: () => reset.mutateAsync(),
    validateStep: candidateService.validateOnboardingStep,
  });

  if (query.isError) {
    return (
      <ProtectedRoute role="candidate">
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
      <ProtectedRoute role="candidate">
        <div className="grid min-h-dvh place-items-center">
          <LoadingState label="Loading your progress…" />
        </div>
      </ProtectedRoute>
    );
  }

  const step = engine.state.currentStep;

  return (
    <ProtectedRoute role="candidate">
      <OnboardingShell
        workspace="Candidate"
        steps={ONBOARDING_STEPS}
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
        <CandidateOnboardingStep
          step={step}
          data={engine.state.data}
          update={engine.update}
          onAdvance={() => engine.goTo("complete", true)}
          onEnterWorkspace={() => void navigate({ to: "/candidate" })}
        />
      </OnboardingShell>
    </ProtectedRoute>
  );
}
