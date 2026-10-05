import type { Prisma } from "@/prisma/generated/client";











export const ANIMAL_IMAGE_ORDER: Prisma.AnimalImageOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
];
