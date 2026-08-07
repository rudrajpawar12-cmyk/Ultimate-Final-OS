import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { aiService } from "@/services/ai.service";
import { billingService } from "@/services/billing.service";
import { notificationService } from "@/services/notification.service";
import { searchService } from "@/services/search.service";
import type {
  CopilotMessage,
  CopilotMode,
  InsightAudience,
  InsightTopic,
} from "@/types/ai";
import type { FeatureKey, PaymentMethod, PlanId, Subscription } from "@/types/billing";

/**
 * Hook layer for platform-wide features (AI, notifications, billing, search).
 * Components use these hooks only — never services or repositories directly.
 */

export const platformKeys = {
  notifications: ["platform", "notifications"] as const,
  billing: ["platform", "billing"] as const,
  searchIndex: ["platform", "search-index"] as const,
  prompts: (audience: InsightAudience) => ["platform", "prompts", audience] as const,
  conversation: (audience: InsightAudience) => ["platform", "conversation", audience] as const,
  insights: (audience: InsightAudience, topic: InsightTopic) =>
    ["platform", "insights", audience, topic] as const,
};

/* ------------------------------ Notifications ------------------------------ */

export function useNotifications() {
  return useQuery({
    queryKey: platformKeys.notifications,
    queryFn: () => notificationService.list(),
  });
}

export function useNotificationSummary() {
  const { data } = useNotifications();
  return useMemo(() => notificationService.summarise(data ?? []), [data]);
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: platformKeys.notifications });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      void invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const clearAll = useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => {
      void invalidate();
      toast.success("Notifications cleared");
    },
  });

  return { markRead, markAllRead, clearAll };
}

/* --------------------------------- Billing -------------------------------- */

export function useBillingOverview() {
  return useQuery({
    queryKey: platformKeys.billing,
    queryFn: () => billingService.getOverview(),
  });
}

export function useBillingActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: platformKeys.billing });

  const changePlan = useMutation({
    mutationFn: (planId: PlanId) => billingService.changePlan(planId),
    onSuccess: (subscription) => {
      void invalidate();
      toast.success(`You're now on the ${subscription.planId} plan`);
    },
    onError: () => toast.error("Couldn't update your plan. Try again."),
  });

  const setBillingCycle = useMutation({
    mutationFn: (cycle: Subscription["billingCycle"]) => billingService.setBillingCycle(cycle),
    onSuccess: invalidate,
  });

  const savePaymentMethod = useMutation({
    mutationFn: (method: PaymentMethod) => billingService.savePaymentMethod(method),
    onSuccess: () => {
      void invalidate();
      toast.success("Payment method saved");
    },
    onError: () => toast.error("Couldn't save that card. Check the details."),
  });

  return { changePlan, setBillingCycle, savePaymentMethod };
}

export function useFeatureGate(key: FeatureKey) {
  const { data } = useBillingOverview();
  return useMemo(() => billingService.gate(data, key), [data, key]);
}

/* --------------------------------- Search --------------------------------- */

export function useGlobalSearch(query: string) {
  const { data, isLoading } = useQuery({
    queryKey: platformKeys.searchIndex,
    queryFn: () => searchService.getIndex(),
    staleTime: 60_000,
  });

  const results = useMemo(() => searchService.search(data ?? [], query), [data, query]);
  const groups = useMemo(() => searchService.group(results), [results]);

  return { results, groups, isLoading };
}

/* ----------------------------------- AI ----------------------------------- */

export function useSuggestedPrompts(audience: InsightAudience) {
  return useQuery({
    queryKey: platformKeys.prompts(audience),
    queryFn: () => aiService.getSuggestedPrompts(audience),
    staleTime: Infinity,
  });
}

export function useAiInsights(
  audience: InsightAudience,
  topic: InsightTopic,
  options?: { context?: string; enabled?: boolean },
) {
  return useQuery({
    queryKey: [...platformKeys.insights(audience, topic), options?.context ?? ""],
    queryFn: () => aiService.getInsights(audience, topic, options?.context),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCopilot(audience: InsightAudience) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [mode, setMode] = useState<CopilotMode>("chat");
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  useQuery({
    queryKey: platformKeys.conversation(audience),
    queryFn: async () => {
      const conversation = await aiService.loadConversation(audience);
      if (!hydrated.current) {
        hydrated.current = true;
        setMessages(conversation.messages);
      }
      return conversation;
    },
    staleTime: Infinity,
  });

  const persist = useCallback(
    (next: CopilotMessage[]) => {
      setMessages(next);
      void aiService.saveConversation(audience, next);
      return next;
    },
    [audience],
  );

  const send = useCallback(
    async (text: string, sendMode: CopilotMode = mode) => {
      const content = text.trim();
      if (!content || status === "streaming") return;

      setError(null);
      const userMessage = aiService.createMessage("user", content, sendMode);
      const assistantMessage = aiService.createMessage("assistant", "", sendMode);
      const history = [...messages, userMessage];
      setMessages([...history, assistantMessage]);
      setStatus("streaming");

      try {
        const reply = await aiService.send({
          history,
          mode: sendMode,
          audience,
          onToken: (token) =>
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + token }
                  : message,
              ),
            ),
        });
        persist([...history, { ...assistantMessage, content: reply }]);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Something went wrong.";
        setError(message);
        toast.error(message);
        persist([...history, { ...assistantMessage, content: message, failed: true }]);
      } finally {
        setStatus("idle");
      }
    },
    [audience, messages, mode, persist, status],
  );

  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    const trimmed = messages.slice(0, messages.lastIndexOf(lastUser));
    setMessages(trimmed);
    void send(lastUser.content, lastUser.mode ?? mode);
  }, [messages, mode, send]);

  const clear = useCallback(() => {
    void aiService.clearConversation(audience);
    setMessages([]);
    setError(null);
  }, [audience]);

  return {
    messages,
    mode,
    setMode,
    status,
    error,
    send,
    retry,
    clear,
    isStreaming: status === "streaming",
  };
}
