import type { TransactionClient } from "@/app/lib/prisma";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { checkTimelineChange } from "@/app/lib/data/animal-timeline.data";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatus,
  lockAnimal,
} from "@/app/lib/data/application-status.data";
import { assertNoLiveAdoptionOutcome } from "@/app/lib/services/outcome-reversal";
import {
  AnimalActivityType,
  AnimalListingStatus,
  ApplicationStatus,
  FosterPlacementType,
  FosterReturnReason,
  OutcomeType,
} from "@/prisma/generated/enums";
import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
  TimelineOrderError,
} from "@/app/lib/utils/errors";



export type FosterConversionValues = {
  placementId: string;
  adoptionApplicationId?: string;
};

export const recordFosterConversion = async (
  tx: TransactionClient,
  values: FosterConversionValues,
  staffMemberId: string,
): Promise<{ animalId: string }> => {
  const { placementId, adoptionApplicationId } = values;

  const placement = await tx.fosterPlacement.findUnique({
    where: { id: placementId },
    select: {
      endDate: true,
      type: true,
      animalId: true,
      fosterProfile: {
        select: { person: { select: { id: true, name: true } } },
      },
    },
  });

  if (!placement) {
    throw new NotFoundError("Foster placement not found.");
  }
  if (placement.endDate !== null) {
    throw new ConflictError("This foster placement has already ended.");
  }
  if (placement.type !== FosterPlacementType.FOSTER_TO_ADOPT) {
    throw new PreconditionFailedError(
      "Only foster-to-adopt placements can be converted here. Use the standard outcome flow to process an adoption for other placement types.",
    );
  }

  
  
  
  
  
  
  
  await lockAnimal(tx, placement.animalId);
  const animal = await tx.animal.findUnique({
    where: { id: placement.animalId },
    select: { listingStatus: true },
  });
  const archiveResult = await tx.animal.updateMany({
    where: {
      id: placement.animalId,
      listingStatus: { not: AnimalListingStatus.ARCHIVED },
    },
    data: {
      listingStatus: AnimalListingStatus.ARCHIVED,
      archiveReason: OutcomeType.ADOPTION,
    },
  });
  if (!animal || archiveResult.count === 0) {
    throw new ConflictError(
      "This animal has already been processed for an outcome.",
    );
  }

  
  
  
  
  
  
  
  const outcomeDate = await getShelterToday();
  const refusal = await checkTimelineChange(tx, placement.animalId, {
    kind: "addOutcome",
    day: outcomeDate,
  });
  if (refusal) {
    throw new TimelineOrderError(refusal, "outcomeDate");
  }

  if (adoptionApplicationId) {
    const application = await tx.adoptionApplication.findUnique({
      where: { id: adoptionApplicationId },
      select: { ...DERIVATION_APPLICATION_SELECT, applicantId: true },
    });
    if (!application || application.animalId !== placement.animalId) {
      throw new PreconditionFailedError(
        "That adoption application does not belong to this animal.",
      );
    }
    
    
    
    
    
    
    if (application.applicantId !== placement.fosterProfile.person.id) {
      throw new PreconditionFailedError(
        "That adoption application does not belong to this foster.",
      );
    }
    await assertNoLiveAdoptionOutcome(tx, application.id);
    
    
    
    if (
      (await effectiveApplicationStatus(application, tx)) !==
      ApplicationStatus.APPROVED
    ) {
      throw new PreconditionFailedError(
        "Cannot convert: the linked adoption application has not been approved.",
      );
    }
  }

  const outcome = await tx.outcome.create({
    data: {
      type: OutcomeType.ADOPTION,
      outcomeDate,
      previousListingStatus: animal.listingStatus,
      animal: { connect: { id: placement.animalId } },
      staffMember: { connect: { id: staffMemberId } },
      ...(adoptionApplicationId && {
        adoptionApplication: { connect: { id: adoptionApplicationId } },
      }),
    },
  });

  const outcomeRow = await tx.animalActivityLog.create({
    data: {
      animalId: placement.animalId,
      activityType: AnimalActivityType.OUTCOME_PROCESSED,
      changedById: staffMemberId,
      changeSummary: "Animal was processed for outcome: adoption.",
    },
    select: { changedAt: true },
  });

  
  
  
  

  
  const updateResult = await tx.fosterPlacement.updateMany({
    where: { id: placementId, endDate: null },
    data: {
      endDate: await getShelterToday(),
      returnReason: FosterReturnReason.ADOPTED_BY_FOSTER,
      returnedById: staffMemberId,
      outcomeId: outcome.id,
      ...(adoptionApplicationId && { adoptionApplicationId }),
    },
  });
  if (updateResult.count === 0) {
    throw new ConflictError("This foster placement has already ended.");
  }

  
  
  
  await tx.animalActivityLog.create({
    data: {
      animalId: placement.animalId,
      activityType: AnimalActivityType.FOSTER_RETURNED,
      changedById: staffMemberId,
      changeSummary: `Foster-to-adopt placement with ${placement.fosterProfile.person.name} converted to an adoption.`,
      changedAt: new Date(
        Math.max(Date.now(), outcomeRow.changedAt.getTime() + 1),
      ),
    },
  });

  return { animalId: placement.animalId };
};
