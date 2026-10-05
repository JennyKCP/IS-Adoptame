import { getToolName, isStaticToolUIPart } from "ai";
import type { AiToolName } from "./tool-names";
import type { ShelterUIMessage } from "./ui-message";

type ChatPart = ShelterUIMessage["parts"][number];


type ToolPart = Extract<ChatPart, { type: `tool-${string}` }>;




const STEP_LABELS: Record<AiToolName, string> = {
  getAttentionQueue: "Checking today's attention queue",
  findAnimals: "Looking up animals",
  getAnimalSummary: "Reading the record",
  getAnimalReadiness: "Checking adoption readiness",
  setTaskStatus: "Updating the task",
};

const THINKING_STEP = { key: "thinking", label: "Thinking" } as const;

export type ActiveStep = { key: string; label: string };

export type ToolFailureNote = { toolCallId: string; reason: string };


export function resolveAnimalNames(parts: readonly ChatPart[]): Map<string, string> {
  const names = new Map<string, string>();

  for (const part of parts) {
    switch (part.type) {
      case "tool-findAnimals":
        if (part.state === "output-available" && part.output.ok) {
          for (const match of part.output.matches) {
            names.set(match.animalId, match.name);
          }
        }
        break;
      case "tool-getAttentionQueue":
        if (part.state === "output-available" && part.output.ok) {
          for (const entry of part.output.queue) {
            names.set(entry.animalId, entry.name);
          }
        }
        break;
      case "tool-getAnimalSummary":
        if (part.state === "output-available" && part.output.ok) {
          names.set(part.output.animal.animalId, part.output.animal.name);
        }
        break;
      case "tool-getAnimalReadiness":
        if (part.state === "output-available" && part.output.ok) {
          names.set(part.output.readiness.animalId, part.output.readiness.name);
        }
        break;
    }
  }

  return names;
}

function labelForToolPart(
  part: ToolPart,
  animalNames: Map<string, string>,
): string {
  
  
  
  if (part.type === "tool-getAnimalSummary" && part.input?.animalId) {
    const name = animalNames.get(part.input.animalId);
    if (name) return `Reading ${name}'s record`;
  }
  if (part.type === "tool-getAnimalReadiness" && part.input?.animalId) {
    const name = animalNames.get(part.input.animalId);
    if (name) return `Checking ${name}'s readiness`;
  }

  return STEP_LABELS[getToolName(part) as AiToolName] ?? "Working";
}


export function describeActiveStep(input: {
  status: "submitted" | "streaming" | "ready" | "error";
  messages: readonly ShelterUIMessage[];
}): ActiveStep | null {
  if (input.status !== "submitted" && input.status !== "streaming") {
    return null;
  }

  const message = input.messages.at(-1);
  if (!message || message.role !== "assistant") {
    
    return THINKING_STEP;
  }

  
  
  
  
  
  const animalNames = resolveAnimalNames(
    input.messages.flatMap((m) => m.parts),
  );

  for (let i = message.parts.length - 1; i >= 0; i--) {
    const part = message.parts[i];

    
    if (part.type === "step-start") continue;

    if (part.type === "text") {
      
      
      return part.text.trim() === "" ? THINKING_STEP : null;
    }

    if (isStaticToolUIPart(part)) {
      return { key: part.toolCallId, label: labelForToolPart(part, animalNames) };
    }
  }

  return THINKING_STEP;
}


export function collectToolFailures(
  parts: readonly ChatPart[],
): ToolFailureNote[] {
  const notes: ToolFailureNote[] = [];
  
  
  
  const seenReasons = new Set<string>();

  const add = (toolCallId: string, reason: string) => {
    if (seenReasons.has(reason)) return;
    seenReasons.add(reason);
    notes.push({ toolCallId, reason });
  };

  for (const part of parts) {
    if (!isStaticToolUIPart(part)) continue;

    if (part.state === "output-available" && !part.output.ok) {
      add(part.toolCallId, part.output.reason);
    } else if (part.state === "output-error") {
      
      
      
      add(part.toolCallId, "A lookup failed unexpectedly.");
    }
  }

  return notes;
}
