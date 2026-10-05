import type {
  AnimalHealthStatus,
  TaskPriority,
} from "@/prisma/generated/enums";
import type { AttentionQueueItem } from "@/app/lib/data/animals/attention-queue.data";
import type { CalendarDay } from "@/app/lib/utils/shelter-day";

export type AttentionReasonView =
  | {
      kind: "TASK_DUE";
      taskId: string;
      title: string;
      dueDate: string;
      
      overdue: boolean;
      priority: TaskPriority;
    }
  | { kind: "UNTASKED_ACUTE_HEALTH"; healthStatus: AnimalHealthStatus }
  | {
      kind: "FOSTER_OVERDUE";
      placementId: string;
      expectedEndDate: string;
      fosterName: string;
    };

export type AttentionQueueEntry = {
  animalId: string;
  name: string;
  species: string;
  currentUnit: string | null;
  reasons: AttentionReasonView[];
};


export function toAttentionQueueView(
  items: AttentionQueueItem[],
  today: CalendarDay,
): AttentionQueueEntry[] {
  return items.map((item) => ({
    animalId: item.animalId,
    name: item.name,
    species: item.species,
    currentUnit: item.currentUnit,
    reasons: item.reasons.map((reason) => toReasonView(reason, today)),
  }));
}

function toReasonView(
  reason: AttentionQueueItem["reasons"][number],
  today: CalendarDay,
): AttentionReasonView {
  switch (reason.kind) {
    case "TASK_DUE":
      return {
        kind: "TASK_DUE",
        taskId: reason.taskId,
        title: reason.title,
        dueDate: reason.dueDate,
        
        
        overdue: reason.dueDate < today,
        priority: reason.priority,
      };
    case "UNTASKED_ACUTE_HEALTH":
      return {
        kind: "UNTASKED_ACUTE_HEALTH",
        healthStatus: reason.healthStatus,
      };
    case "FOSTER_OVERDUE":
      return {
        kind: "FOSTER_OVERDUE",
        placementId: reason.placementId,
        expectedEndDate: reason.expectedEndDate,
        fosterName: reason.fosterName,
      };
  }
}
