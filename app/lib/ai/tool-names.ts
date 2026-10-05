
export type AiToolName =
  | "findAnimals"
  | "getAnimalReadiness"
  | "getAnimalSummary"
  | "getAttentionQueue"
  | "setTaskStatus";


export const WRITE_TOOL_NAMES: readonly AiToolName[] = ["setTaskStatus"];
