/**
 * POST /api/skill-gap — builds a learning roadmap for the signed-in candidate.
 *
 * Body: { targetRole?: string, jobId?: string, refresh?: boolean }
 * When `targetRole` is omitted the candidate's first desired role is used.
 */

import { createFileRoute } from "@tanstack/react-router";

import { getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { aiErrorResponse } from "@/lib/ai-json.server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth.server";
import { runSkillGap } from "@/lib/career-ai.server";

export const Route = createFileRoute("/api/skill-gap")({
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

        let body: { targetRole?: unknown; jobId?: unknown; refresh?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        const targetRole = typeof body.targetRole === "string" ? body.targetRole.trim() : "";
        const jobId = typeof body.jobId === "string" && body.jobId.trim() ? body.jobId.trim() : null;

        try {
          const analysis = await runSkillGap(userId, targetRole, {
            jobId,
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
