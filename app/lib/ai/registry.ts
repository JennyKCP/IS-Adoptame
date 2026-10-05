import type { Actor } from "@/app/lib/auth/actor";
import { can } from "@/app/lib/auth/can";
import type { AppPermission } from "@/app/lib/auth/permissions";
import type { AiToolName } from "./tool-names";
import {
  FIND_ANIMALS_PERMISSIONS,
  findAnimalsTool,
} from "./tools/find-animals";
import {
  GET_ANIMAL_READINESS_PERMISSIONS,
  getAnimalReadinessTool,
} from "./tools/get-animal-readiness";
import {
  GET_ANIMAL_SUMMARY_PERMISSIONS,
  getAnimalSummaryTool,
} from "./tools/get-animal-summary";
import {
  GET_ATTENTION_QUEUE_PERMISSIONS,
  getAttentionQueueTool,
} from "./tools/get-attention-queue";
import {
  SET_TASK_STATUS_PERMISSIONS,
  setTaskStatusTool,
} from "./tools/set-task-status";

export type { AiToolName };





const AI_TOOLS = {
  findAnimals: findAnimalsTool,
  getAnimalReadiness: getAnimalReadinessTool,
  getAnimalSummary: getAnimalSummaryTool,
  getAttentionQueue: getAttentionQueueTool,
  setTaskStatus: setTaskStatusTool,
} satisfies Record<AiToolName, unknown>;

export type AiToolSet = typeof AI_TOOLS;




const TOOL_PERMISSIONS: Record<AiToolName, readonly AppPermission[]> = {
  findAnimals: FIND_ANIMALS_PERMISSIONS,
  getAnimalReadiness: GET_ANIMAL_READINESS_PERMISSIONS,
  getAnimalSummary: GET_ANIMAL_SUMMARY_PERMISSIONS,
  getAttentionQueue: GET_ATTENTION_QUEUE_PERMISSIONS,
  setTaskStatus: SET_TASK_STATUS_PERMISSIONS,
};

const TOOL_NAMES = Object.keys(TOOL_PERMISSIONS) as AiToolName[];


export function toolNamesForActor(actor: Actor): AiToolName[] {
  return TOOL_NAMES.filter((name) =>
    TOOL_PERMISSIONS[name].every((permission) => can(actor.role, permission)),
  );
}


export function buildToolsForActor(actor: Actor): {
  tools: AiToolSet;
  toolsContext: Record<AiToolName, Actor>;
} {
  const tools: Record<string, AiToolSet[AiToolName]> = {};
  const toolsContext: Record<string, Actor> = {};

  for (const name of toolNamesForActor(actor)) {
    tools[name] = AI_TOOLS[name];
    toolsContext[name] = actor;
  }

  return {
    tools: tools as AiToolSet,
    toolsContext: toolsContext as Record<AiToolName, Actor>,
  };
}
