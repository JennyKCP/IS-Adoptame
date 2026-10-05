import prisma, { type TransactionClient } from "@/app/lib/prisma";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatus,
  lockAnimal,
} from "@/app/lib/data/application-status.data";
import {
  checkPlacementsInsideStay,
  checkTimelineChange,
  type TimelineChange,
} from "@/app/lib/data/animal-timeline.data";
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
import {
  calendarDay,
  formatShelterDay,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";
import type { OutcomeFormOutput } from "@/app/lib/zod-schemas/outcome.schema";



export interface OutcomeToRecord {
  animalId: string;
  adoptionApplicationId?: string;
  values: OutcomeFormOutput;
}

export interface RecordedOutcome {
  
  fosterPersonId: string | null;
}

const describe = (value: string) => value.replace(/_/g, " ").toLowerCase();



const assertOutcomeDayFits = async (
  tx: TransactionClient,
  animalId: string,
  change: TimelineChange,
) => {
  const refusal =
    (await checkTimelineChange(tx, animalId, change)) ??
    (await checkPlacementsInsideStay(tx, animalId, change));
  if (refusal) {
    throw new TimelineOrderError(refusal, "outcomeDate");
  }
};


export const recordOutcome = async (
  tx: TransactionClient,
  { animalId, adoptionApplicationId, values }: OutcomeToRecord,
  actorId: string,
): Promise<RecordedOutcome> => {
  const { outcomeDate, outcomeType, destinationPartnerId, ownerId, notes } =
    values;

  
  
  
  
  
  await lockAnimal(tx, animalId);
  const animal = await tx.animal.findUnique({
    where: { id: animalId },
    select: { listingStatus: true, currentUnitId: true },
  });

  
  
  
  if (!animal || animal.listingStatus === AnimalListingStatus.ARCHIVED) {
    throw new ConflictError(
      "This animal has already been processed for an outcome.",
    );
  }

  
  
  
  
  const openPlacements = await tx.fosterPlacement.findMany({
    where: { animalId, endDate: null },
    select: {
      id: true,
      type: true,
      fosterProfile: {
        select: { person: { select: { id: true, name: true } } },
      },
    },
    take: 2,
  });
  
  
  
  
  if (openPlacements.length > 1) {
    throw new ConflictError(
      "This animal has more than one open foster placement. Return all but one before recording an outcome.",
    );
  }
  const [openPlacement] = openPlacements;
  const foster = openPlacement?.fosterProfile.person;

  
  
  await assertOutcomeDayFits(tx, animalId, {
    kind: "addOutcome",
    day: outcomeDate,
  });

  
  
  const updateResult = await tx.animal.updateMany({
    where: {
      id: animalId,
      listingStatus: { not: AnimalListingStatus.ARCHIVED },
    },
    data: {
      listingStatus: AnimalListingStatus.ARCHIVED,
      archiveReason: outcomeType,
      
      
      
      
      
      currentUnitId: null,
    },
  });
  if (updateResult.count === 0) {
    throw new ConflictError(
      "This animal has already been processed for an outcome.",
    );
  }

  
  
  
  
  
  if (adoptionApplicationId && outcomeType !== OutcomeType.ADOPTION) {
    throw new PreconditionFailedError(
      "Only an adoption outcome can be recorded against an adoption application.",
    );
  }

  
  let adopterId: string | null = null;

  
  if (outcomeType === OutcomeType.ADOPTION) {
    if (!adoptionApplicationId) {
      throw new PreconditionFailedError(
        "An adoption application ID is required for adoption outcomes.",
      );
    }

    const application = await tx.adoptionApplication.findUnique({
      where: { id: adoptionApplicationId },
      select: { ...DERIVATION_APPLICATION_SELECT, applicantId: true },
    });

    if (application && application.animalId !== animalId) {
      throw new PreconditionFailedError(
        "Cannot process adoption: The application is for a different animal.",
      );
    }
    if (application) {
      await assertNoLiveAdoptionOutcome(tx, application.id);
    }
    
    
    
    
    
    if (
      !application ||
      (await effectiveApplicationStatus(application, tx)) !==
        ApplicationStatus.APPROVED
    ) {
      throw new PreconditionFailedError(
        "Cannot process adoption: The application has not been approved.",
      );
    }
    adopterId = application.applicantId;
  }

  
  
  
  
  const adoptedByFoster = !!foster && adopterId === foster.id;
  if (
    adoptedByFoster &&
    openPlacement?.type === FosterPlacementType.FOSTER_TO_ADOPT
  ) {
    throw new PreconditionFailedError(
      `${foster.name} is adopting this animal from their foster-to-adopt placement. Convert the placement to an adoption from the animal's page instead.`,
    );
  }

  
  const outcome = await tx.outcome.create({
    data: {
      outcomeDate,
      type: outcomeType,
      
      
      notes: notes || null,
      previousListingStatus: animal.listingStatus,
      animal: { connect: { id: animalId } },
      staffMember: { connect: { id: actorId } },
      
      ...(adoptionApplicationId && {
        adoptionApplication: { connect: { id: adoptionApplicationId } },
      }),
      
      
      
      ...(destinationPartnerId &&
        outcomeType === OutcomeType.TRANSFER_OUT && {
          destinationPartner: { connect: { id: destinationPartnerId } },
        }),
      ...(ownerId &&
        outcomeType === OutcomeType.RETURN_TO_OWNER && {
          owner: { connect: { id: ownerId } },
        }),
      ...(animal.currentUnitId && {
        previousUnit: { connect: { id: animal.currentUnitId } },
      }),
    },
    select: { id: true },
  });

  
  
  
  const outcomeRow = await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: AnimalActivityType.OUTCOME_PROCESSED,
      changedById: actorId,
      changeSummary: `Animal was processed for outcome: ${outcomeType
        .replace(/_/g, " ")
        .toLowerCase()}.`,
    },
    select: { changedAt: true },
  });

  if (openPlacement && foster) {
    
    
    
    const closed = await tx.fosterPlacement.updateMany({
      where: { id: openPlacement.id, endDate: null },
      data: {
        endDate: outcomeDate,
        returnReason: adoptedByFoster
          ? FosterReturnReason.ADOPTED_BY_FOSTER
          : FosterReturnReason.ENDED_BY_OUTCOME,
        returnedById: actorId,
        outcomeId: outcome.id,
      },
    });
    if (closed.count === 0) {
      throw new ConflictError(
        "This animal's foster placement changed while the outcome was being recorded. Please try again.",
      );
    }

    
    
    
    
    
    
    
    
    await tx.animalActivityLog.create({
      data: {
        animalId,
        activityType: AnimalActivityType.FOSTER_RETURNED,
        changedById: actorId,
        changeSummary: `Foster placement with ${foster.name} ended: ${
          adoptedByFoster ? "adopted by the foster" : describe(outcomeType)
        }.`,
        changedAt: new Date(
          Math.max(Date.now(), outcomeRow.changedAt.getTime() + 1),
        ),
      },
    });
  }

  
  
  
  

  return { fosterPersonId: foster?.id ?? null };
};

interface OutcomeCorrectionFields {
  outcomeDate: CalendarDay;
  notes: string | null;
  destinationPartnerId: string | null;
  ownerId: string | null;
}







const describeOutcomeCorrection = async (
  before: OutcomeCorrectionFields,
  after: OutcomeCorrectionFields,
  endedPlacement: boolean,
): Promise<string | null> => {
  const changes: string[] = [];

  if (before.outcomeDate !== after.outcomeDate) {
    changes.push(
      `the date changed from ${formatShelterDay(before.outcomeDate)} to ${formatShelterDay(after.outcomeDate)}`,
    );
    if (endedPlacement) {
      changes.push("the foster placement's end moved with it");
    }
  }

  if (before.destinationPartnerId !== after.destinationPartnerId) {
    const ids = [before.destinationPartnerId, after.destinationPartnerId].filter(
      (id): id is string => !!id,
    );
    const partners = await prisma.partner.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) =>
      partners.find((partner) => partner.id === id)?.name ?? "none";
    changes.push(
      `the destination partner changed from ${nameOf(before.destinationPartnerId)} to ${nameOf(after.destinationPartnerId)}`,
    );
  }

  if (before.ownerId !== after.ownerId) {
    const ids = [before.ownerId, after.ownerId].filter(
      (id): id is string => !!id,
    );
    const owners = await prisma.person.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) =>
      owners.find((owner) => owner.id === id)?.name ?? "none";
    changes.push(
      `the owner changed from ${nameOf(before.ownerId)} to ${nameOf(after.ownerId)}`,
    );
  }

  if (before.notes !== after.notes) {
    changes.push(
      !before.notes
        ? "notes were added"
        : !after.notes
          ? "notes were removed"
          : "notes were edited",
    );
  }

  return changes.length > 0
    ? `Outcome was corrected: ${changes.join("; ")}.`
    : null;
};

const REVERSED_MESSAGE =
  "This outcome was reversed, so it can no longer be corrected.";

export type OutcomeCorrection = RecordedOutcome & {
  status: "corrected" | "unchanged";
  animalId: string;
};


export const recordOutcomeCorrection = async (
  outcomeId: string,
  values: OutcomeFormOutput,
  actorId: string,
  options?: { timeout: number },
): Promise<OutcomeCorrection> => {
  const { outcomeDate, outcomeType, destinationPartnerId, ownerId, notes } =
    values;

  const existingOutcome = await prisma.outcome.findUnique({
    where: { id: outcomeId },
    select: {
      animalId: true,
      outcomeDate: true,
      type: true,
      notes: true,
      destinationPartnerId: true,
      ownerId: true,
      reversedAt: true,
      fosterPlacement: { select: { id: true } },
    },
  });

  if (!existingOutcome) {
    throw new NotFoundError("Error: Outcome record not found.");
  }

  const { animalId } = existingOutcome;

  
  
  
  if (existingOutcome.reversedAt) {
    throw new ConflictError(REVERSED_MESSAGE);
  }

  
  
  
  
  
  
  
  
  
  
  
  
  if (outcomeType !== existingOutcome.type) {
    throw new PreconditionFailedError(
      "The outcome type can't be changed once an outcome is recorded. To fix a wrong type, reverse this outcome and record the right one.",
    );
  }

  
  
  
  
  
  
  
  const nextValues: OutcomeCorrectionFields = {
    outcomeDate,
    notes: notes || null,
    destinationPartnerId:
      outcomeType === OutcomeType.TRANSFER_OUT
        ? destinationPartnerId || null
        : null,
    ownerId:
      outcomeType === OutcomeType.RETURN_TO_OWNER ? ownerId || null : null,
  };

  const changeSummary = await describeOutcomeCorrection(
    {
      ...existingOutcome,
      outcomeDate: calendarDay(existingOutcome.outcomeDate),
    },
    nextValues,
    !!existingOutcome.fosterPlacement,
  );

  
  if (!changeSummary) {
    return { status: "unchanged", animalId, fosterPersonId: null };
  }

  const fosterPersonId = await prisma.$transaction(async (tx) => {
    
    
    
    
    await lockAnimal(tx, animalId);

    
    
    
    const stored = await tx.outcome.findUnique({
      where: { id: outcomeId },
      select: {
        outcomeDate: true,
        reversedAt: true,
        
        
        
        fosterPlacement: {
          select: {
            id: true,
            fosterProfile: { select: { person: { select: { id: true } } } },
          },
        },
      },
    });
    if (!stored || stored.reversedAt) {
      throw new ConflictError(REVERSED_MESSAGE);
    }
    const placement = stored.fosterPlacement;

    
    
    
    
    
    const dayMoves = calendarDay(stored.outcomeDate) !== nextValues.outcomeDate;
    if (dayMoves) {
      
      
      await assertOutcomeDayFits(tx, animalId, {
        kind: "moveOutcome",
        outcomeId,
        day: nextValues.outcomeDate,
      });
    }

    
    
    const updated = await tx.outcome.updateMany({
      where: { id: outcomeId, reversedAt: null },
      data: nextValues,
    });
    if (updated.count === 0) {
      throw new ConflictError(REVERSED_MESSAGE);
    }

    if (placement && dayMoves) {
      await tx.fosterPlacement.update({
        where: { id: placement.id },
        data: { endDate: nextValues.outcomeDate },
      });
    }

    await tx.animalActivityLog.create({
      data: {
        animalId,
        activityType: AnimalActivityType.OUTCOME_CORRECTED,
        changedById: actorId,
        changeSummary,
      },
    });

    return placement && dayMoves ? placement.fosterProfile.person.id : null;
  }, options);

  return { status: "corrected", animalId, fosterPersonId };
};
