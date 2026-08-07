import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";

import { buildCopilotSystemPrompt } from "@/lib/ai-prompts";
import { COPILOT_MODEL, createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import type { CopilotMode, InsightAudience } from "@/types/ai";

interface CopilotBody {
  messages?: { role: "user" | "assistant"; content: string }[];
  mode?: CopilotMode;
  audience?: InsightAudience;
}

export const Route = createFileRoute("/api/copilot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: CopilotBody;
        try {
          body = (await request.json()) as CopilotBody;
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (messages.length === 0) {
          return new Response("At least one message is required", { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response("AI is not configured", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey, getLovableAiGatewayRunId(request));

        try {
          const result = streamText({
            model: gateway(COPILOT_MODEL),
            system: buildCopilotSystemPrompt(body.audience ?? "candidate", body.mode ?? "chat"),
            messages: messages.map((message) => ({
              role: message.role,
              content: String(message.content ?? "").slice(0, 8000),
            })),
            providerOptions: { lovable: { reasoningEffort: "none" } },
          });

          return result.toTextStreamResponse();
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
