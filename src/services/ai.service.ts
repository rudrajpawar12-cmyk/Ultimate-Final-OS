import { httpAiRepository, type AiRepository } from "@/repositories/ai.repository";
import type {
  AiInsight,
  CopilotMessage,
  CopilotMode,
  InsightAudience,
  InsightTopic,
} from "@/types/ai";

export const COPILOT_MODES: { value: CopilotMode; label: string; description: string }[] = [
  { value: "chat", label: "Career chat", description: "Ask anything about your career" },
  { value: "resume", label: "Resume", description: "Improvement suggestions" },
  { value: "interview", label: "Interview", description: "Guidance and practice" },
  { value: "roadmap", label: "Roadmap", description: "Generate a career plan" },
  { value: "skills", label: "Skills", description: "What to learn next" },
  { value: "jobs", label: "Jobs", description: "Recommendation summary" },
  { value: "insights", label: "Insights", description: "Personalised analysis" },
];

export const CANDIDATE_INSIGHT_TOPICS: InsightTopic[] = [
  "resume",
  "career-growth",
  "skill-gap",
  "interview-readiness",
];

export const RECRUITER_INSIGHT_TOPICS: InsightTopic[] = [
  "hiring-recommendations",
  "candidate-match",
  "recruitment-health",
  "job-performance",
];

function createId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Service layer: owns AI business rules (message shaping, history trimming,
 * confidence banding). Hooks call this; UI never touches the repository.
 */
export function createAiService(repository: AiRepository = httpAiRepository) {
  return {
    createMessage(role: CopilotMessage["role"], content: string, mode?: CopilotMode) {
      return {
        id: createId(),
        role,
        content,
        createdAt: new Date().toISOString(),
        mode,
      } satisfies CopilotMessage;
    },

    async send({
      history,
      mode,
      audience,
      onToken,
    }: {
      history: CopilotMessage[];
      mode: CopilotMode;
      audience: InsightAudience;
      onToken: (token: string) => void;
    }) {
      const payload = history
        .filter((message) => !message.failed && message.content.trim().length > 0)
        .slice(-16)
        .map((message) => ({ role: message.role, content: message.content }));

      return repository.streamReply({ messages: payload, mode, audience }, onToken);
    },

    getSuggestedPrompts: (audience: InsightAudience) => repository.getSuggestedPrompts(audience),
    loadConversation: (audience: InsightAudience) => repository.loadConversation(audience),
    saveConversation: (audience: InsightAudience, messages: CopilotMessage[]) =>
      repository.saveConversation(audience, messages),
    clearConversation: (audience: InsightAudience) => repository.clearConversation(audience),

    getInsights: (audience: InsightAudience, topic: InsightTopic, context?: string) =>
      repository.generateInsights({ audience, topic, context }),

    confidenceBand(confidence: number): { label: string; tone: "high" | "medium" | "low" } {
      if (confidence >= 80) return { label: "High confidence", tone: "high" };
      if (confidence >= 55) return { label: "Medium confidence", tone: "medium" };
      return { label: "Low confidence", tone: "low" };
    },

    sortInsights(insights: AiInsight[]) {
      const weight: Record<AiInsight["tone"], number> = { warning: 0, neutral: 1, positive: 2 };
      return [...insights].sort(
        (a, b) => weight[a.tone] - weight[b.tone] || b.confidence - a.confidence,
      );
    },
  };
}

export const aiService = createAiService();
