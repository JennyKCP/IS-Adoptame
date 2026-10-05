



import type { Prisma } from "@/prisma/generated/client";

export const ACTIVITIES_PER_PAGE = 10;

export const animalActivityLogPageArgs = (
  animalId: string,
  currentPage: number
) => ({
  where: { animalId } satisfies Prisma.AnimalActivityLogWhereInput,
  orderBy: [
    { changedAt: "desc" },
    
    
    { id: "desc" },
  ] satisfies Prisma.AnimalActivityLogOrderByWithRelationInput[],
  take: ACTIVITIES_PER_PAGE,
  skip: (currentPage - 1) * ACTIVITIES_PER_PAGE,
});
