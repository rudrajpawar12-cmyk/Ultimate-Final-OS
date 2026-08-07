import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AutoSaveStatus, OnboardingFlowState, OnboardingStepMeta } from "@/types/onboarding";

interface EngineOptions<TId extends string, TData> {
  steps: readonly OnboardingStepMeta<TId>[];
  /** Server/repository state, delivered by a query hook. */
  remoteState: OnboardingFlowState<TId, TData> | undefined;
  persist: (state: OnboardingFlowState<TId, TData>) => Promise<unknown>;
  resetFlow: () => Promise<OnboardingFlowState<TId, TData>>;
  validateStep?: (step: TId, data: TData) => string | null;
  autoSaveDelay?: number;
}

/**
 * Reusable onboarding engine.
 *
 * Owns step management, progress, validation, resumable state and the
 * auto-save lifecycle (saving / saved / failed / retry). Role-agnostic: the
 * candidate and recruiter flows both drive their UI from this hook.
 */
export function useOnboardingEngine<TId extends string, TData>({
  steps,
  remoteState,
  persist,
  resetFlow,
  validateStep,
  autoSaveDelay = 900,
}: EngineOptions<TId, TData>) {
  const [state, setState] = useState<OnboardingFlowState<TId, TData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<AutoSaveStatus>("idle");
  const [isResetting, setIsResetting] = useState(false);

  const lastSaved = useRef<string | null>(null);
  const pending = useRef<OnboardingFlowState<TId, TData> | null>(null);

  /* Hydrate once from the repository, then keep local ownership (resume later). */
  useEffect(() => {
    if (remoteState && !state) {
      setState(remoteState);
      lastSaved.current = JSON.stringify(remoteState);
    }
  }, [remoteState, state]);

  const flush = useCallback(
    async (next: OnboardingFlowState<TId, TData>) => {
      pending.current = next;
      setAutoSave("saving");
      try {
        await persist(next);
        lastSaved.current = JSON.stringify(next);
        pending.current = null;
        setAutoSave("saved");
      } catch {
        setAutoSave("error");
      }
    },
    [persist],
  );

  /* Debounced auto save on any data change. */
  useEffect(() => {
    if (!state) return;
    if (JSON.stringify(state) === lastSaved.current) return;
    const timer = setTimeout(() => {
      void flush(state);
    }, autoSaveDelay);
    return () => clearTimeout(timer);
  }, [state, autoSaveDelay, flush]);

  const index = useMemo(() => {
    if (!state) return 0;
    return Math.max(
      0,
      steps.findIndex((item) => item.id === state.currentStep),
    );
  }, [state, steps]);

  const meta = steps[index];
  const total = steps.length;
  const progress = Math.round((index / Math.max(total - 1, 1)) * 100);

  const commit = useCallback(
    (next: OnboardingFlowState<TId, TData>) => {
      setState(next);
      void flush(next);
    },
    [flush],
  );

  const update = useCallback((patch: Partial<TData>) => {
    setState((current) =>
      current ? { ...current, data: { ...current.data, ...patch } } : current,
    );
  }, []);

  const goTo = useCallback(
    (target: TId, markCurrentComplete = true) => {
      setState((current) => {
        if (!current) return current;
        const next: OnboardingFlowState<TId, TData> = {
          ...current,
          currentStep: target,
          completedSteps: markCurrentComplete
            ? Array.from(new Set([...current.completedSteps, current.currentStep]))
            : current.completedSteps,
        };
        void flush(next);
        return next;
      });
      setError(null);
    },
    [flush],
  );

  const next = useCallback(() => {
    if (!state) return false;
    const message = validateStep?.(state.currentStep, state.data) ?? null;
    if (message) {
      setError(message);
      return false;
    }
    goTo(steps[Math.min(index + 1, total - 1)].id, true);
    return true;
  }, [state, validateStep, goTo, steps, index, total]);

  const previous = useCallback(() => {
    setError(null);
    goTo(steps[Math.max(index - 1, 0)].id, false);
  }, [goTo, steps, index]);

  const skip = useCallback(() => {
    setError(null);
    goTo(steps[Math.min(index + 1, total - 1)].id, false);
  }, [goTo, steps, index, total]);

  const retrySave = useCallback(() => {
    const target = pending.current ?? state;
    if (target) void flush(target);
  }, [flush, state]);

  const restart = useCallback(async () => {
    setIsResetting(true);
    try {
      const fresh = await resetFlow();
      setState(fresh);
      lastSaved.current = JSON.stringify(fresh);
      setAutoSave("idle");
      setError(null);
    } finally {
      setIsResetting(false);
    }
  }, [resetFlow]);

  return {
    state,
    data: state?.data,
    step: state?.currentStep,
    meta,
    steps,
    index,
    total,
    progress,
    error,
    setError,
    autoSave,
    isResetting,
    isFirst: index === 0,
    isLast: index === total - 1,
    canSkip: Boolean(meta?.skippable),
    completedSteps: state?.completedSteps ?? [],
    update,
    commit,
    goTo,
    next,
    previous,
    skip,
    retrySave,
    restart,
  };
}

export type OnboardingEngine<TId extends string, TData> = ReturnType<
  typeof useOnboardingEngine<TId, TData>
>;
