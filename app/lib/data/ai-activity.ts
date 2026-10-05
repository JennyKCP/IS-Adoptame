import { z } from "zod";
import { AiActionTargetType, TaskStatus } from "@/prisma/generated/enums";




export const taskStatusSnapshotSchema = z.object({
  status: z.enum(TaskStatus),
});

export type TaskStatusSnapshot = z.infer<typeof taskStatusSnapshotSchema>;


export function snapshotSchemaFor(
  targetType: AiActionTargetType,
): z.ZodType<TaskStatusSnapshot> | z.ZodNever {
  switch (targetType) {
    case AiActionTargetType.TASK:
      return taskStatusSnapshotSchema;
    default:
      targetType satisfies never;
      return z.never();
  }
}


export function parseSnapshot(targetType: AiActionTargetType, value: unknown) {
  return snapshotSchemaFor(targetType).safeParse(value);
}


export function isTaskStatusStale(
  currentStatus: TaskStatus,
  after: TaskStatusSnapshot,
): boolean {
  return currentStatus !== after.status;
}


export const STALE_UNDO_MESSAGE =
  "This task was changed after the assistant modified it, so it can't be undone automatically.";


const TOOL_LABELS: Record<string, string> = {
  setTaskStatus: "Task status change",
};

export function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}
