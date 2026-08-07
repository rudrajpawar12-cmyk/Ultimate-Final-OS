import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

import {
  candidatePromptsFixture,
  recruiterPromptsFixture,
} from "@/repositories/fixtures/platform.fixtures";

import type {
  CopilotConversation,
  CopilotMessage,
  CopilotRequest,
  InsightAudience,
  InsightRequest,
  InsightResult,
  SuggestedPrompt,
} from "@/types/ai";

/**
 * Data source boundary for every AI feature.
 * Model calls live behind server routes; conversation history is persisted in
 * the browser for the signed-in device.
 */
export interface AiRepository {
  streamReply(request: CopilotRequest, onToken: (token: string) => void): Promise<string>;
  generateInsights(request: InsightRequest): Promise<InsightResult>;
  getSuggestedPrompts(audience: InsightAudience): Promise<SuggestedPrompt[]>;
  loadConversation(audience: InsightAudience): Promise<CopilotConversation>;
  saveConversation(
    audience: InsightAudience,
    messages: CopilotMessage[],
  ): Promise<CopilotConversation>;
  clearConversation(audience: InsightAudience): Promise<CopilotConversation>;
}

const emptyConversation = (): CopilotConversation => ({
  messages: [],
  updatedAt: new Date().toISOString(),
});

/**
 * Conversation history is persisted per signed-in user in
 * `copilot_conversations` so it follows the account across devices.
 */
async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await getSupabaseClient().auth.getUser();
  return data.user?.id ?? null;
}

/** Loosely typed accessor for the conversations table. */
function conversationsTable() {
  return getSupabaseClient().from("copilot_conversations" as never) as unknown as ReturnType<
    ReturnType<typeof getSupabaseClient>["from"]
  >;
}

async function readConversation(audience: InsightAudience): Promise<CopilotConversation> {
  const userId = await currentUserId();
  if (!userId) return emptyConversation();

  const { data, error } = await conversationsTable()
    .select("*")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();

  if (error || !data) return emptyConversation();

  const stored = data as { messages: unknown; updated_at: string | null };
  const messages = Array.isArray(stored.messages) ? (stored.messages as CopilotMessage[]) : [];
  return { messages, updatedAt: stored.updated_at ?? new Date().toISOString() };
}

async function writeConversation(
  audience: InsightAudience,
  messages: CopilotMessage[],
): Promise<CopilotConversation> {
  const conversation: CopilotConversation = {
    messages,
    updatedAt: new Date().toISOString(),
  };

  const userId = await currentUserId();
  if (!userId) return conversation;

  const payload = {
    user_id: userId,
    audience,
    messages,
    updated_at: conversation.updatedAt,
  };

  await conversationsTable().upsert(payload as never, { onConflict: "user_id,audience" });


  return conversation;

}


async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  if (response.status === 429) return "You're sending requests too quickly. Try again shortly.";
  if (response.status === 402) return "AI credits are exhausted. Upgrade your plan to continue.";
  return text || "The AI service is unavailable right now.";
}

export const httpAiRepository: AiRepository = {
  async streamReply(request, onToken) {
    const response = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok || !response.body) {
      throw new Error(await readError(response));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      full += chunk;
      onToken(chunk);
    }

    if (!full.trim()) throw new Error("The assistant returned an empty response.");
    return full;
  },

  async generateInsights(request) {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error(await readError(response));
    return (await response.json()) as InsightResult;
  },

  async getSuggestedPrompts(audience) {
    return audience === "recruiter" ? recruiterPromptsFixture : candidatePromptsFixture;
  },

  async loadConversation(audience) {
    return readConversation(audience);
  },

  async saveConversation(audience, messages) {
    return writeConversation(audience, messages);
  },

  async clearConversation(audience) {
    const userId = await currentUserId();
    if (userId) {
      await conversationsTable()
        .delete()
        .eq("user_id", userId)
        .eq("audience", audience);
    }
    return emptyConversation();
  },

};
