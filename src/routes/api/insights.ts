import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

import { buildInsightPrompt } from "@/lib/ai-prompts";
import {
  COPILOT_MODEL,
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";
import type { AiInsight, InsightAudience, InsightTone, InsightTopic } from "@/types/ai";

interface InsightBody {
  audience?: InsightAudience;
  topic?: InsightTopic;
  context?: string;
}

const TONES: InsightTone[] = ["positive", "warning", "neutral"];

function parseInsights(text: string): AiInsight[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      insights?: Partial<AiInsight>[];
    };
    const raw = Array.isArray(parsed.insights) ? parsed.insights : [];
    return raw.slice(0, 4).map((item, index) => ({
      id: `ai-${index}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(item.title ?? "Insight").slice(0, 90),
      description: String(item.description ?? "").slice(0, 320),
      recommendation: String(item.recommendation ?? "").slice(0, 320),
      confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence ?? 70)))),
      tone: TONES.includes(item.tone as InsightTone) ? (item.tone as InsightTone) : "neutral",
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 3).map((tag) => String(tag)) : [],
    }));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/api/insights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: InsightBody;
        try {
          body = (await request.json()) as InsightBody;
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }

        if (!body.topic) {
          return new Response("A topic is required", { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response("AI is not configured", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey, getLovableAiGatewayRunId(request));

        try {
          const result = await generateText({
            model: gateway(COPILOT_MODEL),
            prompt: buildInsightPrompt(
              body.audience ?? "candidate",
              body.topic,
              body.context?.slice(0, 4000),
            ),
            providerOptions: { lovable: { reasoningEffort: "none" } },
          });

          const insights = parseInsights(result.text);
          if (insights.length === 0) {
            return new Response("The model returned no usable insights", { status: 502 });
          }

          return Response.json({
            topic: body.topic,
            generatedAt: new Date().toISOString(),
            insights,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
