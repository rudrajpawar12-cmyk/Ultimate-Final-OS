import { AlertTriangle, CheckCircle2, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useAiInsights } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import { aiService } from "@/services/ai.service";
import {
  INSIGHT_TOPIC_LABEL,
  type AiInsight,
  type InsightAudience,
  type InsightTopic,
} from "@/types/ai";

const TONE_STYLES: Record<AiInsight["tone"], { icon: typeof Lightbulb; className: string }> = {
  positive: { icon: CheckCircle2, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-destructive" },
  neutral: { icon: Lightbulb, className: "text-primary" },
};

export function AiInsightCard({ insight }: { insight: AiInsight }) {
  const tone = TONE_STYLES[insight.tone];
  const Icon = tone.icon;
  const band = aiService.confidenceBand(insight.confidence);

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-hidden="true" />
          <CardTitle className="text-base leading-snug">{insight.title}</CardTitle>
        </div>
        <CardDescription>{insight.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          <span className="font-medium">Next step: </span>
          {insight.recommendation}
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{band.label}</span>
            <span>{insight.confidence}%</span>
          </div>
          <Progress
            value={insight.confidence}
            aria-label={`Confidence ${insight.confidence} percent`}
          />
        </div>

        {insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insight.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AiInsightPanelProps {
  audience: InsightAudience;
  topic: InsightTopic;
  /** Workspace context handed to the model so insights are grounded. */
  context?: string;
  title?: string;
  description?: string;
  /** Render collapsed with a "Generate" button instead of fetching immediately. */
  deferred?: boolean;
  className?: string;
}

/**
 * Reusable AI insight surface shared by candidate and recruiter pages.
 */
export function AiInsightPanel({
  audience,
  topic,
  context,
  title,
  description,
  deferred = false,
  className,
}: AiInsightPanelProps) {
  const [enabled, setEnabled] = useState(!deferred);
  const query = useAiInsights(audience, topic, { context, enabled });
  const insights = query.data ? aiService.sortInsights(query.data.insights) : [];

  return (
    <section className={cn("space-y-4", className)} aria-label={INSIGHT_TOPIC_LABEL[topic]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            {title ?? INSIGHT_TOPIC_LABEL[topic]}
          </h2>
          <p className="text-sm text-muted-foreground">
            {description ?? "Generated for your workspace by CareerOS AI."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEnabled(true);
            if (enabled) void query.refetch();
          }}
          disabled={query.isFetching}
        >
          <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          {query.isFetching ? "Generating…" : enabled ? "Regenerate" : "Generate insights"}
        </Button>
      </div>

      {!enabled ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Generate AI insights when you need them — this keeps your AI credits for the work that
            matters.
          </CardContent>
        </Card>
      ) : query.isPending || query.isFetching ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Couldn't generate insights"
          description={
            query.error instanceof Error
              ? query.error.message
              : "The AI service is unavailable right now."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((insight) => (
            <AiInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {query.data && (
        <p className="text-xs text-muted-foreground">
          Generated {new Date(query.data.generatedAt).toLocaleString()} · AI can make mistakes —
          verify before acting.
        </p>
      )}
    </section>
  );
}
