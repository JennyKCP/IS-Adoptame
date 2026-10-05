import prisma, { type TransactionClient } from "@/app/lib/prisma";
import { checkFirstIntakeDay } from "@/app/lib/data/animal-timeline.data";
import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import { findLiveUnitForPlacement } from "@/app/lib/services/unit-housing";
import { toAnimalData } from "@/app/lib/utils/animal-data";
import { startOfShelterDay } from "@/app/lib/utils/shelter-day";
import type { CreateAnimalFormOutput } from "@/app/lib/zod-schemas/animal.schemas";
import {
  AnimalActivityType,
  AnimalListingStatus,
  IntakeType,
} from "@/prisma/generated/enums";


export const recordAnimalCreation = async (
  tx: TransactionClient,
  values: CreateAnimalFormOutput,
  staffMemberId: string,
): Promise<{ animalId: string }> => {
  const {
    animalName,
    estimatedBirthDate,
    sex,
    healthStatus,
    listingStatus,
    species: speciesId,
    breed: breedId,
    primaryColor: primaryColorId,
    additionalColors: additionalColorIds,
    intakeType,
    intakeDate,
    weightGrams,
    heightCm,
  } = values;

  const mapped = toAnimalData(values);

  
  
  const allColorIds = Array.from(
    new Set([primaryColorId, ...additionalColorIds]),
  );

  const speciesRecord = await tx.species.findUnique({
    where: { id: speciesId },
    select: { name: true },
  });

  if (!speciesRecord) {
    throw new Error("Invalid Species ID provided.");
  }

  
  const validColorCount = await tx.color.count({
    where: { id: { in: allColorIds }, deletedAt: null },
  });
  if (validColorCount !== allColorIds.length) {
    throw new Error("One or more selected colors are no longer available.");
  }

  
  
  
  
  let resolvedUnitId: string | null = null;
  let resolvedUnitLabel: {
    name: string;
    location: { name: string };
  } | null = null;
  if (mapped.currentUnitId) {
    const unit = await findLiveUnitForPlacement(tx, mapped.currentUnitId);
    resolvedUnitId = unit?.id ?? null;
    resolvedUnitLabel = unit
      ? { name: unit.name, location: unit.location }
      : null;
  }

  
  const publishedAt =
    listingStatus === AnimalListingStatus.PUBLISHED ? new Date() : null;

  const newAnimal = await tx.animal.create({
    data: {
      name: animalName,
      birthDate: estimatedBirthDate,
      sex: sex,
      size: mapped.size,
      description: mapped.description,
      
      
      
      currentWeightGrams: weightGrams,
      heightCm,
      healthStatus: healthStatus,
      listingStatus: listingStatus,
      publishedAt: publishedAt,
      microchipNumber: mapped.microchipNumber,
      isSpayedNeutered: mapped.isSpayedNeutered,
      currentUnit: resolvedUnitId
        ? { connect: { id: resolvedUnitId } }
        : undefined,
      species: { connect: { id: speciesId } },
      breeds: { connect: { id: breedId } },
      colors: { connect: allColorIds.map((id) => ({ id })) },
      primaryColor: { connect: { id: primaryColorId } },
    },
  });

  await tx.intake.create({
    data: {
      type: intakeType,
      intakeDate: intakeDate,
      notes: mapped.notes,
      animalId: newAnimal.id,
      staffMemberId: staffMemberId,
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
      foundCity:
        intakeType === IntakeType.STRAY ? mapped.foundCity : undefined,
      foundState:
        intakeType === IntakeType.STRAY ? mapped.foundState : undefined,
    },
  });

  
  
  
  
  
  if (weightGrams) {
    await tx.vitalsLog.create({
      data: {
        animalId: newAnimal.id,
        recordedById: staffMemberId,
        
        
        
        recordedAt: startOfShelterDay(intakeDate, (await getShelterSettings()).timezone),
        weightGrams,
      },
    });
  }

  const intakeSummaryBase = `Animal was admitted as ${intakeType
    .replace(/_/g, " ")
    .toLowerCase()}`;
  
  
  
  const intakeSummary = resolvedUnitLabel
    ? `${intakeSummaryBase}; placed in ${resolvedUnitLabel.location.name} · ${resolvedUnitLabel.name}.`
    : `${intakeSummaryBase}.`;

  const intakeRow = await tx.animalActivityLog.create({
    data: {
      animalId: newAnimal.id,
      activityType: AnimalActivityType.INTAKE_PROCESSED,
      changedById: staffMemberId,
      changeSummary: intakeSummary,
    },
    select: { changedAt: true },
  });

  
  if (listingStatus === AnimalListingStatus.PUBLISHED) {
    await tx.animalActivityLog.create({
      data: {
        animalId: newAnimal.id,
        activityType: AnimalActivityType.STATUS_CHANGE,
        changedById: staffMemberId,
        changeSummary: `Listing status changed to PUBLISHED.`,
        
        
        
        
        changedAt: new Date(
          Math.max(Date.now(), intakeRow.changedAt.getTime() + 1),
        ),
      },
    });
  }

  return { animalId: newAnimal.id };
};


export const createAnimalFromForm = async (
  values: CreateAnimalFormOutput,
  staffMemberId: string,
): Promise<{ refusal: string } | { animalId: string }> => {
  
  
  
  const refusal = await checkFirstIntakeDay(values.intakeDate);
  if (refusal) {
    return { refusal };
  }

  return prisma.$transaction((tx) =>
    recordAnimalCreation(tx, values, staffMemberId),
  );
};
