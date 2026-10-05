





import type { AnimalHealthStatus, TaskPriority } from "@/prisma/generated/enums";
import type { CalendarDay } from "@/app/lib/utils/shelter-day";


export const ACUTE_HEALTH_STATUSES = [
  "AWAITING_TRIAGE",
  "AWAITING_VET_EXAM",
  "UNDER_VET_CARE",
  "HOSPITALISED",
  "AWAITING_OTHER_SURGERY",
  "RECOVERING_FROM_SURGERY",
] as const satisfies readonly AnimalHealthStatus[];


export const ATTENTION_QUEUE_CAP = 20;


const PRIORITY_RANK: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};


export type AttentionAnimal = {
  id: string;
  name: string;
  species: string;
  currentUnit: string | null; 
};

export type TaskDueRow = {
  animal: AttentionAnimal;
  taskId: string;
  title: string;
  dueDate: CalendarDay;
  priority: TaskPriority;
};

export type AcuteHealthRow = {
  animal: AttentionAnimal;
  healthStatus: AnimalHealthStatus;
};

export type FosterOverdueRow = {
  animal: AttentionAnimal;
  placementId: string;
  expectedEndDate: CalendarDay;
  fosterName: string; 
};



export type AttentionReason =
  | {
      kind: "TASK_DUE";
      taskId: string;
      title: string;
      dueDate: CalendarDay;
      priority: TaskPriority;
    }
  | { kind: "UNTASKED_ACUTE_HEALTH"; healthStatus: AnimalHealthStatus }
  | {
      kind: "FOSTER_OVERDUE";
      placementId: string;
      expectedEndDate: CalendarDay;
      fosterName: string;
    };

export type AttentionQueueItem = {
  animalId: string;
  name: string;
  species: string;
  currentUnit: string | null;
  reasons: AttentionReason[];
};


const TIER = { TASK_DUE: 1, UNTASKED_ACUTE_HEALTH: 2, FOSTER_OVERDUE: 3 } as const;

function reasonTier(reason: AttentionReason): number {
  return TIER[reason.kind];
}



function compareReasons(a: AttentionReason, b: AttentionReason): number {
  const byTier = reasonTier(a) - reasonTier(b);
  if (byTier !== 0) return byTier;
  if (a.kind === "TASK_DUE" && b.kind === "TASK_DUE") {
    
    const byDue = a.dueDate.localeCompare(b.dueDate);
    if (byDue !== 0) return byDue;
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.taskId.localeCompare(b.taskId);
  }
  return 0;
}


export function buildAttentionQueue(input: {
  tasksDue: TaskDueRow[];
  acuteHealth: AcuteHealthRow[];
  fostersOverdue: FosterOverdueRow[];
}): AttentionQueueItem[] {
  const byAnimal = new Map<
    string,
    { animal: AttentionAnimal; reasons: AttentionReason[] }
  >();

  const ensure = (animal: AttentionAnimal) => {
    let entry = byAnimal.get(animal.id);
    if (!entry) {
      entry = { animal, reasons: [] };
      byAnimal.set(animal.id, entry);
    }
    return entry;
  };

  for (const row of input.tasksDue) {
    ensure(row.animal).reasons.push({
      kind: "TASK_DUE",
      taskId: row.taskId,
      title: row.title,
      dueDate: row.dueDate,
      priority: row.priority,
    });
  }
  for (const row of input.acuteHealth) {
    ensure(row.animal).reasons.push({
      kind: "UNTASKED_ACUTE_HEALTH",
      healthStatus: row.healthStatus,
    });
  }
  for (const row of input.fostersOverdue) {
    ensure(row.animal).reasons.push({
      kind: "FOSTER_OVERDUE",
      placementId: row.placementId,
      expectedEndDate: row.expectedEndDate,
      fosterName: row.fosterName,
    });
  }

  const items = [...byAnimal.values()].map(({ animal, reasons }) => {
    const sortedReasons = [...reasons].sort(compareReasons);
    return {
      item: {
        animalId: animal.id,
        name: animal.name,
        species: animal.species,
        currentUnit: animal.currentUnit,
        reasons: sortedReasons,
      } satisfies AttentionQueueItem,
      
      tier: Math.min(...sortedReasons.map(reasonTier)),
      firstTask: sortedReasons.find((r) => r.kind === "TASK_DUE"),
      firstFoster: sortedReasons.find((r) => r.kind === "FOSTER_OVERDUE"),
    };
  });

  items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;

    if (a.tier === TIER.TASK_DUE && a.firstTask && b.firstTask) {
      const byDue = a.firstTask.dueDate.localeCompare(b.firstTask.dueDate);
      if (byDue !== 0) return byDue;
      const byPriority =
        PRIORITY_RANK[a.firstTask.priority] - PRIORITY_RANK[b.firstTask.priority];
      if (byPriority !== 0) return byPriority;
    }

    if (a.tier === TIER.FOSTER_OVERDUE && a.firstFoster && b.firstFoster) {
      const byExpected = a.firstFoster.expectedEndDate.localeCompare(
        b.firstFoster.expectedEndDate,
      );
      if (byExpected !== 0) return byExpected;
    }

    
    return (
      a.item.name.localeCompare(b.item.name) ||
      a.item.animalId.localeCompare(b.item.animalId)
    );
  });

  return items.slice(0, ATTENTION_QUEUE_CAP).map(({ item }) => item);
}
