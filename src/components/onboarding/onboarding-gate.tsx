import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/states";
import { useOnboardingState } from "@/hooks/use-candidate";
import { useRecruiterOnboardingState } from "@/hooks/use-recruiter";
import { candidateService } from "@/services/candidate.service";
import { recruiterService } from "@/services/recruiter.service";

type OnboardingPath = "/candidate/onboarding" | "/recruiter/onboarding";

/**
 * Dashboard entry logic (frontend).
 * A workspace only renders once onboarding is complete; otherwise the user is
 * routed back into the flow they left. Backend checks slot in behind the
 * service layer without touching this component.
 */
function OnboardingGate({
  isLoading,
  isError,
  complete,
  onRetry,
  to,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  complete: boolean;
  onRetry: () => void;
  to: OnboardingPath;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isError && !complete) {
      void navigate({ to, replace: true });
    }
  }, [isLoading, isError, complete, navigate, to]);

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingState label="Preparing your workspace…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          title="We couldn't check your setup"
          description="Your saved progress is safe. Retry in a moment."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (!complete) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Taking you to onboarding…" />
      </div>
    );
  }

  return <>{children}</>;
}

export function CandidateOnboardingGate({ children }: { children: ReactNode }) {
  const query = useOnboardingState();
  return (
    <OnboardingGate
      isLoading={query.isLoading}
      isError={query.isError}
      complete={query.data ? candidateService.isOnboardingComplete(query.data) : false}
      onRetry={() => void query.refetch()}
      to="/candidate/onboarding"
    >
      {children}
    </OnboardingGate>
  );
}

export function RecruiterOnboardingGate({ children }: { children: ReactNode }) {
  const query = useRecruiterOnboardingState();
  return (
    <OnboardingGate
      isLoading={query.isLoading}
      isError={query.isError}
      complete={query.data ? recruiterService.isOnboardingComplete(query.data) : false}
      onRetry={() => void query.refetch()}
      to="/recruiter/onboarding"
    >
      {children}
    </OnboardingGate>
  );
}
