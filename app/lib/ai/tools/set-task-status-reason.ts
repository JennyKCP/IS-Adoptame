import type { TaskStatus } from "@/prisma/generated/enums";


export function buildApprovalReason(facts: {
  taskTitle: string;
  animalName: string;
  unitLabel: string | null;
  currentStatus: TaskStatus;
  requestedStatus: TaskStatus;
}): string {
  const where = facts.unitLabel ? ` (${facts.unitLabel})` : "";
  return (
    `Mark "${facts.taskTitle}" on ${facts.animalName}${where} as ` +
    `${facts.requestedStatus}. Currently ${facts.currentStatus}.`
  );
}


export function formatUnitLabel(
  unit: { name: string; location: { name: string } } | null,
): string | null {
  return unit ? `${unit.location.name} · ${unit.name}` : null;
}
