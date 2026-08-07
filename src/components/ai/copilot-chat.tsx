import { RotateCcw, Send, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { useCopilot, useSuggestedPrompts } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import { COPILOT_MODES } from "@/services/ai.service";
import type { InsightAudience } from "@/types/ai";

export function CopilotChat({
  audience,
  className,
}: {
  audience: InsightAudience;
  className?: string;
}) {
  const copilot = useCopilot(audience);
  const prompts = useSuggestedPrompts(audience);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!copilot.isStreaming) textareaRef.current?.focus();
  }, [copilot.isStreaming, audience]);

  const modePrompts = (prompts.data ?? []).filter(
    (prompt) => copilot.mode === "chat" || prompt.mode === copilot.mode,
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Copilot mode">
        {COPILOT_MODES.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={copilot.mode === item.value ? "default" : "outline"}
            className="rounded-full"
            aria-pressed={copilot.mode === item.value}
            title={item.description}
            onClick={() => copilot.setMode(item.value)}
          >
            {item.label}
          </Button>
        ))}
        <div className="ms-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copilot.retry}
            disabled={copilot.isStreaming || copilot.messages.length === 0}
          >
            <RotateCcw className="size-4" /> Retry
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copilot.clear}
            disabled={copilot.messages.length === 0}
          >
            <Trash2 className="size-4" /> Clear
          </Button>
        </div>
      </div>

      <Conversation className="min-h-[22rem] flex-1 rounded-2xl border border-border/70 bg-card">
        <ConversationContent className="gap-6">
          {copilot.messages.length === 0 ? (
            <ConversationEmptyState
              title="Your career copilot is ready"
              description={
                audience === "recruiter"
                  ? "Ask about pipeline health, screening questions or candidate comparisons."
                  : "Ask about your resume, interviews, skills or a career roadmap."
              }
            />
          ) : (
            copilot.messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent className={cn(message.failed && "text-destructive")}>
                  {message.content ? (
                    <MessageResponse>{message.content}</MessageResponse>
                  ) : (
                    <Shimmer>Thinking…</Shimmer>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {modePrompts.length > 0 && copilot.messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {modePrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => void copilot.send(prompt.prompt, prompt.mode)}
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      <PromptInput
        onSubmit={(message) => {
          const text = message.text?.trim();
          if (text) void copilot.send(text);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          placeholder={
            audience === "recruiter"
              ? "Ask about your pipeline, candidates or job posts…"
              : "Ask about your resume, skills, interviews or next role…"
          }
        />
        <PromptInputFooter className="justify-between">
          <span className="text-xs text-muted-foreground">
            AI can make mistakes — verify important details.
          </span>
          <PromptInputSubmit
            size="icon-sm"
            status={copilot.isStreaming ? "streaming" : undefined}
            disabled={copilot.isStreaming}
          >
            <Send className="size-4" />
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
