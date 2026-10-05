import type { TransactionClient } from "@/app/lib/prisma";
import { AnimalActivityType, type TaskStatus } from "@/prisma/generated/enums";
import { NotFoundError } from "@/app/lib/utils/errors";


export async function applyTaskStatusChange(
  tx: TransactionClient,
  params: { taskId: string; status: TaskStatus; changedById: string },
): Promise<{
  animalId: string;
  previousStatus: TaskStatus;
  title: string;
  changed: boolean;
}> {
  const { taskId, status, changedById } = params;

  const existing = await tx.task.findUnique({
    where: { id: taskId },
    select: { status: true, title: true },
  });

  if (!existing) {
    throw new NotFoundError("Task not found.");
  }

  const task = await tx.task.update({
    where: { id: taskId },
    data: { status },
    select: { animalId: true },
  });

  const changed = existing.status !== status;

  if (changed) {
    await tx.animalActivityLog.create({
      data: {
        animalId: task.animalId,
        activityType: AnimalActivityType.TASK_STATUS_CHANGED,
        changedById,
        changeSummary: `Task "${existing.title}" status changed from ${existing.status} to ${status}.`,
      },
    });
  }

  return {
    animalId: task.animalId,
    previousStatus: existing.status,
    title: existing.title,
    changed,
  };
}
