"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { collectToolFailures } from "@/app/lib/ai/chat-progress";
import type { ShelterUIMessage } from "@/app/lib/ai/ui-message";
import { MarkdownAnswer } from "./markdown-answer";
import { ApprovalCard, ApprovalOutcome } from "./approval-card";

type Part = ShelterUIMessage["parts"][number];
type SetTaskStatusPart = Extract<Part, { type: "tool-setTaskStatus" }>;

const isSetTaskStatusPart = (part: Part): part is SetTaskStatusPart =>
  part.type === "tool-setTaskStatus";


export function ChatMessage({
  message,
  isIncomplete,
  onApprovalRespond,
}: {
  message: ShelterUIMessage;
  isIncomplete?: boolean;
  onApprovalRespond: (approvalId: string, approved: boolean) => void;
}) {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  const failures = collectToolFailures(message.parts);
  const writeParts = message.parts.filter(isSetTaskStatusPart);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2 text-sm break-words whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  
  
  if (!text && failures.length === 0 && writeParts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {failures.map((failure) => (
        <div
          key={failure.toolCallId}
          className="text-muted-foreground border-border bg-muted/40 flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
        >
          <IconAlertTriangle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            <span className="font-medium">A lookup didn&apos;t work.</span>{" "}
            {failure.reason}
          </span>
        </div>
      ))}

      {writeParts.map((part) => (
        <WriteToolPart
          key={part.toolCallId}
          part={part}
          onApprovalRespond={onApprovalRespond}
        />
      ))}

      {text && (
        <div className="max-w-[95%]">
          <MarkdownAnswer text={text} />
          {isIncomplete && (
            <p className="text-muted-foreground mt-2 text-xs italic">
              This answer was cut off before it finished.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WriteToolPart({
  part,
  onApprovalRespond,
}: {
  part: SetTaskStatusPart;
  onApprovalRespond: (approvalId: string, approved: boolean) => void;
}) {
  switch (part.state) {
    case "approval-requested":
      return (
        <ApprovalCard
          reason={
            part.approval.requestReason ??
            "Confirm this task-status change."
          }
          onRespond={(approved) =>
            onApprovalRespond(part.approval.id, approved)
          }
        />
      );

    case "approval-responded":
      return <ApprovalOutcome approved={part.approval.approved} />;

    case "output-denied":
      
      
      return (
        <ApprovalOutcome
          approved={false}
          note={part.approval.isAutomatic ? part.approval.reason : undefined}
        />
      );

    case "output-available":
      if (!part.output.ok) return null; 
      return (
        <ApprovalOutcome
          approved
          note={
            part.output.result.changed
              ? `"${part.output.result.title}" is now ${part.output.result.newStatus}.`
              : `"${part.output.result.title}" was already ${part.output.result.newStatus}.`
          }
        />
      );

    default:
      
      
      return null;
  }
}
