import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayRunIdFetch() {
  return {
    fetch,
    getRunId: () => undefined,
    waitForRunId: async () => undefined,
  };
}

export function createLovableAiGatewayProvider(
  apiKey: string,
  _initialRunId?: string,
  _options?: { structuredOutputs?: boolean },
) {
  const provider = createOpenAICompatible({
    name: "groq",
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  return Object.assign(provider, {
    getRunId: () => undefined,
    waitForRunId: async () => undefined,
  });
}

export function getLovableAiGatewayRunId(_request: Request) {
  return undefined;
}

export const COPILOT_MODEL = "llama-3.3-70b-versatile";