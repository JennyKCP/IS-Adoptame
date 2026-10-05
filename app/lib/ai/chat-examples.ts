import type { AiToolName } from "./tool-names";


export type ChatExample = {
  
  label: string;
  
  prompt: string;
  
  requiresTools: readonly AiToolName[];
};

const CHAT_EXAMPLES: readonly ChatExample[] = [
  {
    label: "What needs attention today?",
    prompt: "What animals need attention today?",
    requiresTools: ["getAttentionQueue"],
  },
  {
    label: "Tell me about Bruno",
    prompt: "Tell me about Bruno.",
    requiresTools: ["findAnimals", "getAnimalSummary"],
  },
  {
    label: "What's going on with Fern?",
    prompt: "What's going on with Fern? Is anyone looking after her?",
    requiresTools: ["findAnimals", "getAnimalSummary"],
  },
  {
    label: "Is Buddy ready for adoption?",
    prompt: "Is Buddy ready for adoption?",
    requiresTools: ["findAnimals", "getAnimalReadiness"],
  },
  {
    label: "Does Juniper have open tasks?",
    prompt: "Does Juniper have any open tasks?",
    requiresTools: ["findAnimals", "getAnimalSummary"],
  },
  {
    label: "Mark Daisy's post-op recheck done",
    prompt: "Mark Daisy's post-op wound recheck as done.",
    requiresTools: ["findAnimals", "getAnimalSummary", "setTaskStatus"],
  },
] as const;


export function examplesForTools(
  availableTools: readonly AiToolName[],
): ChatExample[] {
  const available = new Set(availableTools);
  return CHAT_EXAMPLES.filter((example) =>
    example.requiresTools.every((tool) => available.has(tool)),
  );
}
