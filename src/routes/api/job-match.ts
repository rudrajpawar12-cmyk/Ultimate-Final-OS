/**
 * POST /api/job-match — scores the signed-in candidate against one job.
 *
 * Body: { jobId: string, refresh?: boolean }
 * Cached per (user, job) fingerprint; `refresh: true` forces regeneration.
 */

import { createFileRoute } from "@tanstack/react-router";

import { getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { aiErrorResponse } from "@/lib/ai-json.server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth.server";
import { runJobMatch } from "@/lib/career-ai.server";

export const Route = createFileRoute("/api/job-match")({
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

        let body: { jobId?: unknown; refresh?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
            { status: 400 },
          );
        }

        const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
        if (!jobId) {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "A jobId is required." } },
            { status: 400 },
          );
        }

        try {
          const analysis = await runJobMatch(userId, jobId, {
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
