import type { TransactionClient } from "@/app/lib/prisma";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import { findLiveUnitForPlacement } from "@/app/lib/services/unit-housing";
import {
  AnimalActivityType,
  AnimalListingStatus,
} from "@/prisma/generated/enums";
import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
} from "@/app/lib/utils/errors";
import {
  buildLocationChangeSummary,
  formatUnitLabel,
} from "@/app/lib/utils/location-activity";



export interface OutcomeReversal {
  animalId: string;
  
  adoptionApplicationId: string | null;
  
  restoredListingStatus: AnimalListingStatus | null;
  
  reopenedPlacementId: string | null;
  
  fosterPersonId: string | null;
  
  restoredUnitId: string | null;
  
  effects: string;
}

const describe = (value: string) => value.replace(/_/g, " ").toLowerCase();

export const recordOutcomeReversal = async (
  tx: TransactionClient,
  outcomeId: string,
  reason: string,
  actorId: string,
): Promise<OutcomeReversal> => {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new PreconditionFailedError(
      "A reason for reversing this outcome is required.",
    );
  }

  
  const located = await tx.outcome.findUnique({
    where: { id: outcomeId },
    select: { animalId: true },
  });
  if (!located) {
    throw new NotFoundError("Outcome not found.");
  }
  const { animalId } = located;

  
  
  
  
  await lockAnimal(tx, animalId);

  const outcome = await tx.outcome.findUnique({
    where: { id: outcomeId },
    select: {
      type: true,
      reversedAt: true,
      previousListingStatus: true,
      adoptionApplicationId: true,
      
      
      
      previousUnit: {
        select: {
          id: true,
          name: true,
          location: { select: { name: true } },
        },
      },
      fosterPlacement: {
        select: {
          id: true,
          fosterProfile: {
            select: { person: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!outcome) {
    throw new NotFoundError("Outcome not found.");
  }
  
  
  if (outcome.reversedAt) {
    throw new ConflictError("This outcome has already been reversed.");
  }

  
  
  
  
  
  
  
  
  const animal = await tx.animal.findUnique({
    where: { id: animalId },
    select: { listingStatus: true, currentUnitId: true },
  });
  const latestLive = await tx.outcome.findFirst({
    where: { animalId, reversedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  const archivedByThisOutcome =
    animal?.listingStatus === AnimalListingStatus.ARCHIVED &&
    latestLive?.id === outcomeId;

  
  
  
  
  
  

  
  
  const reversed = await tx.outcome.updateMany({
    where: { id: outcomeId, reversedAt: null },
    data: {
      reversedAt: new Date(),
      reversedById: actorId,
      reversalReason: trimmedReason,
    },
  });
  if (reversed.count === 0) {
    throw new ConflictError("This outcome has already been reversed.");
  }

  const effects: string[] = [];
  let restoredListingStatus: AnimalListingStatus | null = null;
  let reopenedPlacementId: string | null = null;
  let restoredUnit: Awaited<ReturnType<typeof findLiveUnitForPlacement>> =
    null;

  if (archivedByThisOutcome) {
    
    
    
    
    
    
    
    
    restoredListingStatus =
      outcome.previousListingStatus ?? AnimalListingStatus.DRAFT;
    
    
    await tx.animal.update({
      where: { id: animalId },
      data: { listingStatus: restoredListingStatus, archiveReason: null },
    });
    effects.push(
      outcome.previousListingStatus
        ? `The listing was restored to ${describe(restoredListingStatus)}.`
        : "The listing was set to draft, since nothing recorded what it was before this outcome.",
    );

    
    
    
    
    
    
    if (outcome.fosterPlacement) {
      reopenedPlacementId = outcome.fosterPlacement.id;
      await tx.fosterPlacement.update({
        where: { id: reopenedPlacementId },
        data: {
          endDate: null,
          returnReason: null,
          returnedById: null,
          adoptionApplicationId: null,
        },
      });
      effects.push(
        `The foster placement with ${outcome.fosterPlacement.fosterProfile.person.name} was reopened.`,
      );
    }

    
    
    
    
    
    
    
    
    
    
    
    const previousUnit = outcome.previousUnit;
    if (!outcome.fosterPlacement && !animal.currentUnitId) {
      const liveUnit = previousUnit
        ? await findLiveUnitForPlacement(tx, previousUnit.id)
        : null;
      if (liveUnit) {
        restoredUnit = liveUnit;
        await tx.animal.update({
          where: { id: animalId },
          data: { currentUnitId: liveUnit.id },
        });
        const label = formatUnitLabel(liveUnit);
        effects.push(`It was put back in ${label}.`);
        
        const occupancy = await tx.animal.count({
          where: {
            currentUnitId: liveUnit.id,
            listingStatus: { not: AnimalListingStatus.ARCHIVED },
          },
        });
        if (occupancy > liveUnit.capacity) {
          effects.push(
            `${label} is now over capacity (${occupancy}/${liveUnit.capacity}).`,
          );
        }
      } else if (previousUnit) {
        effects.push(
          `It has no unit now, since ${formatUnitLabel(previousUnit)} has been deleted; place it from its record.`,
        );
      } else {
        effects.push("It has no unit now; place it from its record.");
      }
    }
  } else {
    effects.push(
      "The listing was left as it is, since this outcome is no longer what archived the animal.",
    );
  }

  const effectsText = effects.join(" ");

  const reversalRow = await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: AnimalActivityType.OUTCOME_REVERSED,
      changedById: actorId,
      changeSummary: `Outcome was reversed: ${describe(outcome.type)}. ${effectsText} Reason: ${trimmedReason}`,
    },
    select: { changedAt: true },
  });

  
  
  
  
  
  if (restoredUnit) {
    await tx.animalActivityLog.create({
      data: {
        animalId,
        activityType: AnimalActivityType.LOCATION_CHANGE,
        changedById: actorId,
        changeSummary: buildLocationChangeSummary(null, restoredUnit),
        changedAt: new Date(
          Math.max(Date.now(), reversalRow.changedAt.getTime() + 1),
        ),
      },
    });
  }

  return {
    animalId,
    adoptionApplicationId: outcome.adoptionApplicationId,
    restoredListingStatus,
    reopenedPlacementId,
    fosterPersonId: outcome.fosterPlacement?.fosterProfile.person.id ?? null,
    restoredUnitId: restoredUnit?.id ?? null,
    effects: effectsText,
  };
};


export const assertNoLiveAdoptionOutcome = async (
  tx: TransactionClient,
  adoptionApplicationId: string,
): Promise<void> => {
  const live = await tx.outcome.findFirst({
    where: { adoptionApplicationId, reversedAt: null },
    select: { id: true },
  });
  if (live) {
    throw new ConflictError(
      "This application already has an adoption recorded against it.",
    );
  }
};
