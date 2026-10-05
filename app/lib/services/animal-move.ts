import type { TransactionClient } from "@/app/lib/prisma";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import { findLiveUnitForPlacement } from "@/app/lib/services/unit-housing";
import {
  AnimalActivityType,
  AnimalListingStatus,
} from "@/prisma/generated/enums";
import {
  NotFoundError,
  PreconditionFailedError,
} from "@/app/lib/utils/errors";
import { buildLocationChangeSummary } from "@/app/lib/utils/location-activity";




export class AnimalArchivedError extends PreconditionFailedError {
  constructor() {
    super("This animal has left the shelter, so it can't be placed in a unit.");
    this.name = "AnimalArchivedError";
  }
}


export const moveAnimal = async (
  tx: TransactionClient,
  animalId: string,
  targetUnitId: string | null,
  actorId: string,
) => {
  
  
  
  
  
  await lockAnimal(tx, animalId);
  const currentAnimal = await tx.animal.findUnique({
    where: { id: animalId },
    select: {
      listingStatus: true,
      currentUnitId: true,
      currentUnit: {
        select: { name: true, location: { select: { name: true } } },
      },
    },
  });
  if (!currentAnimal) {
    throw new NotFoundError("That animal no longer exists.");
  }
  
  
  
  
  
  
  if (
    currentAnimal.listingStatus === AnimalListingStatus.ARCHIVED &&
    targetUnitId !== null
  ) {
    throw new AnimalArchivedError();
  }
  const previousUnitId = currentAnimal.currentUnitId;
  const previousUnit = currentAnimal.currentUnit;

  
  
  
  
  const target =
    targetUnitId === null
      ? null
      : await findLiveUnitForPlacement(tx, targetUnitId);
  if (targetUnitId !== null && !target) {
    throw new PreconditionFailedError("That unit is no longer available.");
  }
  const targetUnitIdResolved = target?.id ?? null;

  await tx.animal.update({
    where: { id: animalId },
    data: { currentUnitId: targetUnitIdResolved },
  });

  
  
  if (previousUnitId !== targetUnitIdResolved && actorId) {
    await tx.animalActivityLog.create({
      data: {
        animalId,
        activityType: AnimalActivityType.LOCATION_CHANGE,
        changedById: actorId,
        changeSummary: buildLocationChangeSummary(
          previousUnit,
          target ? { name: target.name, location: target.location } : null,
        ),
      },
    });
  }

  return target;
};
