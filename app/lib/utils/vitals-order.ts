import type { Prisma } from "@/prisma/generated/client";














export function latestVitalsEntryOrder(
  direction: "asc" | "desc" = "desc",
): Prisma.VitalsLogOrderByWithRelationInput[] {
  return [
    { recordedAt: direction },
    { createdAt: direction },
    { id: direction },
  ];
}




export const LATEST_ENTRY_ORDER = latestVitalsEntryOrder("desc");
