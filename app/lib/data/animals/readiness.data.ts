import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { AnimalListingStatus } from "@/prisma/generated/enums";
import type {
  AnimalReadiness,
  ReadinessAnimal,
} from "../../readiness/board";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequireAllPermissions } from "../../auth/protected-actions";
import { cuidSchema } from "../../zod-schemas/common.schemas";
import {
  contradictionsByCharacteristic,
  proposalsOf,
} from "../../assessments/proposals";
import { RECORDED_FINDINGS_SELECT, toRecordedAssessment } from "./assessment-characteristic-review";
import { readinessRequirementsFor } from "../../readiness/requirements";
import {
  computeReadiness,
  type ReadinessAssessment,
  type ReadinessBlocker,
  type ReadinessCharacteristicClaim,
} from "../../readiness/compute-readiness";
import {
  calendarDay,
  startOfShelterDay,
} from "@/app/lib/utils/shelter-day";





const READINESS_ASSESSMENT_SELECT = {
  id: true,
  observedAt: true,
  signal: true,
  template: {
    select: {
      key: true,
      ...RECORDED_FINDINGS_SELECT.template.select,
    },
  },
  answers: RECORDED_FINDINGS_SELECT.answers,
} satisfies Prisma.AssessmentSelect;




const READINESS_CLAIM_SELECT = {
  characteristicId: true,
  assignedAt: true,
  characteristic: { select: { name: true } },
  sourceAssessment: {
    select: { ...RECORDED_FINDINGS_SELECT, deletedAt: true, updatedAt: true },
  },
} satisfies Prisma.AnimalCharacteristicSelect;

type ReadinessAssessmentRow = Prisma.AssessmentGetPayload<{
  select: typeof READINESS_ASSESSMENT_SELECT;
}>;
type ReadinessClaimRow = Prisma.AnimalCharacteristicGetPayload<{
  select: typeof READINESS_CLAIM_SELECT;
}>;

const notArchived = {
  listingStatus: { not: AnimalListingStatus.ARCHIVED },
} satisfies Prisma.AnimalWhereInput;

const ANIMAL_IDENTITY_SELECT = {
  id: true,
  isSpayedNeutered: true,
  healthStatus: true,
  createdAt: true,
  species: { select: { name: true } },
  _count: { select: { animalImages: true } },
  
  
  
  intake: {
    select: { intakeDate: true },
    orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
    take: 1,
  },
} satisfies Prisma.AnimalSelect;

type AnimalIdentityRow = Prisma.AnimalGetPayload<{
  select: typeof ANIMAL_IDENTITY_SELECT;
}>;



const BOARD_ANIMAL_SELECT = {
  ...ANIMAL_IDENTITY_SELECT,
  name: true,
  listingStatus: true,
  currentUnit: {
    select: { name: true, location: { select: { id: true, name: true } } },
  },
  
  fosterPlacements: {
    where: { endDate: null },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.AnimalSelect;

type BoardAnimalRow = Prisma.AnimalGetPayload<{
  select: typeof BOARD_ANIMAL_SELECT;
}>;

const toReadinessAnimal = (row: BoardAnimalRow): ReadinessAnimal => ({
  id: row.id,
  name: row.name,
  species: row.species.name,
  listingStatus: row.listingStatus,
  placement: row.currentUnit
    ? {
        kind: "UNIT",
        locationId: row.currentUnit.location.id,
        locationName: row.currentUnit.location.name,
        unitName: row.currentUnit.name,
      }
    : row.fosterPlacements.length > 0
      ? { kind: "FOSTER" }
      : { kind: "UNPLACED" },
});


function readinessFor(
  animal: AnimalIdentityRow,
  assessmentRows: ReadinessAssessmentRow[],
  claimRows: ReadinessClaimRow[],
  timezone: string,
): ReadinessBlocker[] {
  const latestIntake = animal.intake[0];
  const recordedAssessments = assessmentRows.map(toRecordedAssessment);
  const contradictions = contradictionsByCharacteristic(recordedAssessments, timezone);

  const assessments: ReadinessAssessment[] = assessmentRows.map((row) => ({
    id: row.id,
    templateKey: row.template.key,
    templateName: row.template.name,
    observedAt: row.observedAt,
    signal: row.signal,
  }));

  const claims: ReadinessCharacteristicClaim[] = claimRows.map((row) => {
    const source = row.sourceAssessment;
    const sourceDeletedAt = source?.deletedAt ?? null;
    const noLongerSupports =
      source !== null &&
      !sourceDeletedAt &&
      !proposalsOf(toRecordedAssessment(source)).some(
        (p) => p.characteristicId === row.characteristicId,
      );
    const againstIt = contradictions.live.get(row.characteristicId) ?? [];
    const contradictedAt = againstIt.reduce<Date | null>(
      (earliest, { assessment }) =>
        !earliest || assessment.observedAt < earliest
          ? assessment.observedAt
          : earliest,
      null,
    );
    return {
      characteristicId: row.characteristicId,
      characteristicName: row.characteristic.name,
      assignedAt: row.assignedAt,
      contradictedAt,
      sourceDeletedAt,
      supportLostAt: noLongerSupports ? source.updatedAt : null,
    };
  });

  return computeReadiness({
    requirements: readinessRequirementsFor(animal.species.name),
    assessments,
    claims,
    isSpayedNeutered: animal.isSpayedNeutered,
    hasPhoto: animal._count.animalImages > 0,
    healthStatus: animal.healthStatus,
    
    
    
    inCareSince: latestIntake
      ? startOfShelterDay(calendarDay(latestIntake.intakeDate), timezone)
      : animal.createdAt,
  });
}


const readinessOfAnimal = async (
  animalId: string,
): Promise<AnimalReadiness | null> => {
  const [animal, assessmentRows, claimRows] = await Promise.all([
    prisma.animal.findUnique({
      where: { id: animalId },
      select: BOARD_ANIMAL_SELECT,
    }),
    prisma.assessment.findMany({
      where: { animalId, deletedAt: null },
      select: READINESS_ASSESSMENT_SELECT,
    }),
    prisma.animalCharacteristic.findMany({
      where: {
        animalId,
        removedAt: null,
        characteristic: { deletedAt: null },
      },
      select: READINESS_CLAIM_SELECT,
    }),
  ]);

  if (!animal) return null;

  return {
    animal: toReadinessAnimal(animal),
    blockers: readinessFor(animal, assessmentRows, claimRows, (await getShelterSettings()).timezone),
  };
};

const _fetchAnimalReadiness = async (
  animalId: string,
): Promise<ReadinessBlocker[]> => {
  const readiness = await readinessOfAnimal(animalId);
  if (!readiness) {
    throw new Error("Animal not found.");
  }
  return readiness.blockers;
};

export const fetchAnimalReadiness = RequireAllPermissions(
  AppPermissions.ANIMAL_INFO_READ,
  AppPermissions.ANIMAL_ASSESSMENT_READ,
  AppPermissions.ANIMAL_CHARACTERISTICS_READ,
)(_fetchAnimalReadiness);








export const _fetchAnimalReadinessForAssistant = async (
  animalId: string,
): Promise<AnimalReadiness | null> => {
  const parsedId = cuidSchema.safeParse(animalId);
  if (!parsedId.success) return null;
  return readinessOfAnimal(parsedId.data);
};


const _fetchReadinessForAnimals = async (): Promise<AnimalReadiness[]> => {
  const [animals, assessmentRows, claimRows] = await Promise.all([
    prisma.animal.findMany({
      where: notArchived,
      select: BOARD_ANIMAL_SELECT,
    }),
    prisma.assessment.findMany({
      where: { deletedAt: null, animal: notArchived },
      select: { animalId: true, ...READINESS_ASSESSMENT_SELECT },
    }),
    prisma.animalCharacteristic.findMany({
      where: {
        removedAt: null,
        characteristic: { deletedAt: null },
        animal: notArchived,
      },
      select: { animalId: true, ...READINESS_CLAIM_SELECT },
    }),
  ]);

  const assessmentsByAnimal = new Map<string, ReadinessAssessmentRow[]>();
  for (const { animalId, ...row } of assessmentRows) {
    const list = assessmentsByAnimal.get(animalId) ?? [];
    list.push(row);
    assessmentsByAnimal.set(animalId, list);
  }

  const claimsByAnimal = new Map<string, ReadinessClaimRow[]>();
  for (const { animalId, ...row } of claimRows) {
    const list = claimsByAnimal.get(animalId) ?? [];
    list.push(row);
    claimsByAnimal.set(animalId, list);
  }

  const timezone = (await getShelterSettings()).timezone;
  return animals.map((animal) => ({
    animal: toReadinessAnimal(animal),
    blockers: readinessFor(
      animal,
      assessmentsByAnimal.get(animal.id) ?? [],
      claimsByAnimal.get(animal.id) ?? [],
      timezone,
    ),
  }));
};

export const fetchReadinessForAnimals = RequireAllPermissions(
  AppPermissions.ANIMAL_INFO_READ,
  AppPermissions.ANIMAL_ASSESSMENT_READ,
  AppPermissions.ANIMAL_CHARACTERISTICS_READ,
)(_fetchReadinessForAnimals);
