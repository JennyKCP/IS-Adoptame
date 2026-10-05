import prisma from "@/app/lib/prisma";


export function isOwnedByUser<T extends { applicantId: string }>(
  resource: T | null,
  userPersonId: string
): resource is T {
  return resource !== null && resource.applicantId === userPersonId;
}


export async function isFosteringAnimal(
  personId: string,
  animalId: string
): Promise<boolean> {
  
  
  
  if (!personId) {
    return false;
  }

  const openPlacement = await prisma.fosterPlacement.findFirst({
    where: {
      animalId,
      endDate: null,
      fosterProfile: { personId },
    },
    select: { id: true },
  });

  return openPlacement !== null;
}