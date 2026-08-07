/**
 * POST /api/career-recommendations — job, path, salary and technology guidance
 * for the signed-in candidate, grounded in the platform's open jobs.
 *
 * Body: { refresh?: boolean }
 */

import { createFileRoute } from "@tanstack/react-router";

import { getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { aiErrorResponse } from "@/lib/ai-json.server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth.server";
import { runCareerRecommendations } from "@/lib/career-ai.server";

export const Route = createFileRoute("/api/career-recommendations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try {
          ({ userId } = await authenticateRequest(request));
        } catch (error) {
          const status = error instanceof ApiAuthError ? error.status : 401;
          const message = error instanceof Error ? error.message : "Unauthorized";
          return Response.json({ error: { code: "UNAUTHORIZED", message } }, { status });
        }

        let body: { refresh?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        try {
          const analysis = await runCareerRecommendations(userId, {
            runId: getLovableAiGatewayRunId(request),
            force: body.refresh === true,
          });
          return Response.json({ data: analysis });
        } catch (error) {
          return aiErrorResponse(error);
        }
      },
    },
  },
});
