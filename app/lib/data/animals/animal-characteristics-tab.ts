



import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { cuidSchema } from "../../zod-schemas/common.schemas";
import {
  contradictionsByCharacteristic,
  findingsAgainst,
  proposalsOf,
  type ContradictingFinding,
} from "../../assessments/proposals";
import {
  fetchAnimalFindings,
  RECORDED_FINDINGS_SELECT,
  toRecordedAssessment,
} from "./assessment-characteristic-review";


export type CharacteristicAssignment = {
  assignedByName: string | null;
  assignedAt: Date;
  
  sourceAssessmentId: string | null;
  
  sourceAssessment: {
    id: string;
    templateName: string;
    observedAt: Date;
    
    deletedAt: Date | null;
    
    stillSupports: boolean;
  } | null;
};

export type CharacteristicWithAssignment = Prisma.CharacteristicGetPayload<object> & {
  isAssigned: boolean;
  
  assignment: CharacteristicAssignment | null;
  
  contradictedBy: ContradictingFinding[];
};

export const _fetchAnimalCharacteristics = async (
  animalId: string
): Promise<CharacteristicWithAssignment[]> => {

  const validation = cuidSchema.safeParse(animalId);
  if (!validation.success) {
    throw new Error("Invalid animalId format.");
  }

  try {
    const [allCharacteristics, animal, findings] = await Promise.all([
      prisma.characteristic.findMany({
        where: { deletedAt: null },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.animal.findUnique({
        where: { id: animalId },
        select: {
          animalCharacteristics: {
            
            
            where: { removedAt: null },
            select: {
              characteristicId: true,
              assignedAt: true,
              sourceAssessmentId: true,
              assignedBy: { select: { name: true } },
              sourceAssessment: {
                select: { ...RECORDED_FINDINGS_SELECT, deletedAt: true },
              },
            },
          },
        },
      }),
      fetchAnimalFindings(prisma, animalId),
    ]);

    
    if (!animal) {
      throw new Error("Animal not found.");
    }

    const contradictions = contradictionsByCharacteristic(
      findings.liveAssessments,
      (await getShelterSettings()).timezone,
    );

    const assignmentByCharId = new Map(
      animal.animalCharacteristics.map((ac) => [
        ac.characteristicId,
        {
          assignedByName: ac.assignedBy?.name ?? null,
          assignedAt: ac.assignedAt,
          sourceAssessmentId: ac.sourceAssessmentId,
          sourceAssessment: ac.sourceAssessment
            ? {
                id: ac.sourceAssessment.id,
                templateName: ac.sourceAssessment.template.name,
                observedAt: ac.sourceAssessment.observedAt,
                deletedAt: ac.sourceAssessment.deletedAt,
                stillSupports: proposalsOf(
                  toRecordedAssessment(ac.sourceAssessment),
                ).some((p) => p.characteristicId === ac.characteristicId),
              }
            : null,
        } satisfies CharacteristicAssignment,
      ])
    );

    const result = allCharacteristics.map((characteristic) => ({
      ...characteristic,
      isAssigned: assignmentByCharId.has(characteristic.id),
      assignment: assignmentByCharId.get(characteristic.id) ?? null,
      contradictedBy: findingsAgainst(contradictions, characteristic.id),
    }));

    return result;
  } catch (error) {
    console.error("Failed to fetch animal characteristics:", error);
    throw new Error("Could not fetch animal characteristics.");
  }
};
