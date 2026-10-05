import type { TransactionClient } from "@/app/lib/prisma";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import { findLiveUnitForPlacement } from "@/app/lib/services/unit-housing";
import {
  AnimalActivityType,
  AnimalListingStatus,
  FosterPlacementType,
  type FosterReturnReason,
} from "@/prisma/generated/enums";
import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
} from "@/app/lib/utils/errors";



export type FosterReturnValues = {
  placementId: string;
  returnReason: FosterReturnReason;
  returnNotes?: string;
  unitId: string;
};

export const recordFosterReturn = async (
  tx: TransactionClient,
  values: FosterReturnValues,
  staffMemberId: string,
): Promise<{ animalId: string }> => {
  const { placementId, returnReason, returnNotes, unitId } = values;

  const placement = await tx.fosterPlacement.findUnique({
    where: { id: placementId },
    select: {
      endDate: true,
      type: true,
      previousListingStatus: true,
      animalId: true,
      fosterProfile: { select: { person: { select: { name: true } } } },
    },
  });

  if (!placement) {
    throw new NotFoundError("Foster placement not found.");
  }
  if (placement.endDate !== null) {
    throw new ConflictError("This foster placement has already ended.");
  }

  
  
  
  
  
  await lockAnimal(tx, placement.animalId);

  const animal = await tx.animal.findUnique({
    where: { id: placement.animalId },
    select: { listingStatus: true },
  });
  if (!animal || animal.listingStatus === AnimalListingStatus.ARCHIVED) {
    throw new PreconditionFailedError(
      "This animal has already left the shelter, so it can't be returned from foster.",
    );
  }

  
  
  const unit = await findLiveUnitForPlacement(tx, unitId);
  if (!unit) {
    throw new PreconditionFailedError(
      "That unit is no longer available. Please choose a different unit.",
    );
  }

  
  
  
  const updateResult = await tx.fosterPlacement.updateMany({
    where: { id: placementId, endDate: null },
    data: {
      endDate: await getShelterToday(),
      returnReason,
      
      
      returnNotes: returnNotes?.trim() ? returnNotes : null,
      returnedById: staffMemberId,
    },
  });
  if (updateResult.count === 0) {
    throw new ConflictError("This foster placement has already ended.");
  }

  await tx.animal.update({
    where: { id: placement.animalId },
    data: {
      currentUnitId: unitId,
      ...(placement.type === FosterPlacementType.FOSTER_TO_ADOPT &&
        placement.previousListingStatus && {
          listingStatus: placement.previousListingStatus,
        }),
    },
  });

  await tx.animalActivityLog.create({
    data: {
      animalId: placement.animalId,
      activityType: AnimalActivityType.FOSTER_RETURNED,
      changedById: staffMemberId,
      changeSummary: `Returned from foster ${placement.fosterProfile.person.name}.${
        returnNotes ? ` ${returnNotes}` : ""
      }`,
    },
  });

  return { animalId: placement.animalId };
};
