import type { TransactionClient } from "@/app/lib/prisma";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import { checkTimelineChange } from "@/app/lib/data/animal-timeline.data";
import {
  AnimalActivityType,
  AnimalListingStatus,
  IntakeType,
} from "@/prisma/generated/enums";
import { ConflictError, TimelineOrderError } from "@/app/lib/utils/errors";
import type { ReIntakeFormOutput } from "@/app/lib/zod-schemas/intake.schema";



const NOT_ARCHIVED_MESSAGE =
  "Cannot process re-intake: This animal is not currently archived or was just re-intaked.";

export interface ReIntakeToRecord {
  animalId: string;
  values: ReIntakeFormOutput;
}




const toReIntakeData = (data: ReIntakeFormOutput) => ({
  notes: data.notes || null,
  sourcePartnerId: data.sourcePartnerId || null,
  foundAddress: data.foundAddress || null,
  foundCity: data.foundCity || null,
  foundState: data.foundState || null,
  surrenderingPersonId: data.surrenderingPersonId || null,
});


export const recordReIntake = async (
  tx: TransactionClient,
  { animalId, values }: ReIntakeToRecord,
  actorId: string,
): Promise<void> => {
  const { intakeDate, intakeType, healthStatus, isSpayedNeutered } = values;
  const mapped = toReIntakeData(values);

  
  
  
  
  
  
  await lockAnimal(tx, animalId);
  const animal = await tx.animal.findUnique({
    where: { id: animalId },
    select: { listingStatus: true },
  });

  
  
  
  if (!animal || animal.listingStatus !== AnimalListingStatus.ARCHIVED) {
    throw new ConflictError(NOT_ARCHIVED_MESSAGE);
  }

  const refusal = await checkTimelineChange(tx, animalId, {
    kind: "addIntake",
    day: intakeDate,
  });
  if (refusal) {
    throw new TimelineOrderError(refusal, "intakeDate");
  }

  
  
  const updateResult = await tx.animal.updateMany({
    where: {
      id: animalId,
      listingStatus: AnimalListingStatus.ARCHIVED,
    },
    data: {
      listingStatus: AnimalListingStatus.DRAFT,
      archiveReason: null,
      healthStatus: healthStatus,
      isSpayedNeutered: isSpayedNeutered,
    },
  });

  if (updateResult.count === 0) {
    throw new ConflictError(NOT_ARCHIVED_MESSAGE);
  }

  
  await tx.intake.create({
    data: {
      intakeDate,
      type: intakeType,
      notes: mapped.notes,
      animalId,
      staffMemberId: actorId,
      sourcePartnerId:
        intakeType === IntakeType.TRANSFER_IN
          ? mapped.sourcePartnerId
          : undefined,
      surrenderingPersonId:
        intakeType === IntakeType.OWNER_SURRENDER
          ? mapped.surrenderingPersonId
          : undefined,
      foundAddress:
        intakeType === IntakeType.STRAY ? mapped.foundAddress : undefined,
      foundCity: intakeType === IntakeType.STRAY ? mapped.foundCity : undefined,
      foundState:
        intakeType === IntakeType.STRAY ? mapped.foundState : undefined,
    },
  });

  
  await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: AnimalActivityType.INTAKE_PROCESSED,
      changedById: actorId,
      changeSummary: `Animal was re-intaked as ${intakeType
        .replace(/_/g, " ")
        .toLowerCase()}.`,
    },
  });
};
