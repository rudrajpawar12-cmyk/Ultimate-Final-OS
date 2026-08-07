/**
 * POST /api/recruiter-review — AI review of one applicant for the recruiter who
 * owns the job. Ownership is verified server-side before any data is loaded.
 *
 * Body: { applicationId: string, refresh?: boolean }
 */

import { createFileRoute } from "@tanstack/react-router";

import { getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { aiErrorResponse } from "@/lib/ai-json.server";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth.server";
import { runApplicantReview } from "@/lib/career-ai.server";

export const Route = createFileRoute("/api/recruiter-review")({
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

        let body: { applicationId?: unknown; refresh?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
            { status: 400 },
          );
        }

        const applicationId =
          typeof body.applicationId === "string" ? body.applicationId.trim() : "";
        if (!applicationId) {
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "An applicationId is required." } },
            { status: 400 },
          );
        }

        try {
          const review = await runApplicantReview(userId, applicationId, {
            runId: getLovableAiGatewayRunId(request),
            force: body.refresh === true,
          });
          return Response.json({ data: review });
        } catch (error) {
          return aiErrorResponse(error);
        }
      },
    },
  },
});
