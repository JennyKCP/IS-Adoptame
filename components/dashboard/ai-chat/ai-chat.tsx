"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { describeChatError } from "@/app/lib/ai/chat-errors";
import { describeActiveStep } from "@/app/lib/ai/chat-progress";
import type { ChatExample } from "@/app/lib/ai/chat-examples";
import type { AiToolName } from "@/app/lib/ai/tool-names";
import type { ShelterUIMessage } from "@/app/lib/ai/ui-message";
import { ChatComposer } from "./chat-composer";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessage } from "./chat-message";
import { ToolProgress } from "./tool-progress";


const STICK_TO_BOTTOM_PX = 80;


export function AiChat({
  examples,
  availableTools,
}: {
  examples: ChatExample[];
  availableTools: AiToolName[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const { messages, sendMessage, status, error, stop, regenerate, addToolApprovalResponse } =
    useChat<ShelterUIMessage>({
      transport: new DefaultChatTransport({ api: "/api/ai-chat" }),
      
      
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
      onFinish: ({ message }) => {
        
        
        
        
        const wrote = message.parts.some(
          (part) =>
            part.type === "tool-setTaskStatus" &&
            part.state === "output-available" &&
            part.output.ok &&
            part.output.result.changed,
        );
        if (wrote) router.refresh();
      },
    });

  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const activeStep = describeActiveStep({ status, messages });

  
  
  
  const awaitingApproval =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) =>
        part.type === "tool-setTaskStatus" &&
        part.state === "approval-requested",
    );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    stickToBottom.current = true;
    sendMessage({ text: trimmed });
    setInput("");
  };

  
  
  
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, activeStep?.label]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
  };

  
  
  
  const lastMessageHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some((part) => part.type === "text" && part.text !== "");
  const showIncompleteOnLast = status === "error" && lastMessageHasText;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <ChatEmptyState
            examples={examples}
            onPick={send}
            disabled={isBusy || availableTools.length === 0}
          />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-1 pb-2">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isIncomplete={
                  showIncompleteOnLast && message.id === lastMessage?.id
                }
                onApprovalRespond={(approvalId, approved) =>
                  addToolApprovalResponse({
                    id: approvalId,
                    approved,
                    
                    
                    
                    reason: approved
                      ? undefined
                      : "The user reviewed the confirmation and declined. Do not make this change or offer to retry it.",
                  })
                }
              />
            ))}

            
            {activeStep && (
              <ToolProgress key={activeStep.key} step={activeStep} />
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="border-destructive/40 bg-destructive/5 text-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
            <IconAlertCircle
              className="text-destructive mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">{describeChatError(error)}</div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => regenerate()}
            >
              <IconRefresh />
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          onStop={stop}
          isStreaming={isBusy}
          disabled={Boolean(awaitingApproval)}
        />
        <p className="text-muted-foreground mt-2 text-center text-xs">
          {awaitingApproval
            ? "Approve or deny the change above to continue."
            : "Answers come from live shelter data. This conversation isn’t saved — refreshing clears it."}
        </p>
      </div>
    </div>
  );
}
