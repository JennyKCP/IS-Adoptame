import type { TransactionClient } from "@/app/lib/prisma";
import { AnimalActivityType } from "@/prisma/generated/enums";
import {
  proposalsOf,
  suggestionActionFor,
} from "@/app/lib/assessments/proposals";
import { fetchRecordedAssessment } from "@/app/lib/data/animals/assessment-characteristic-review";
import { formatDateToLongString } from "@/app/lib/utils/date-utils";



export interface CharacteristicSuggestionInput {
  assessmentId: string;
  animalId: string;
  characteristicId: string;
}

export type CharacteristicSuggestionOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string };


const assessmentLabel = (a: { templateName: string; observedAt: Date }) =>
  `the ${a.templateName} of ${formatDateToLongString(a.observedAt)}`;

export async function recordCharacteristicSuggestion(
  tx: TransactionClient,
  { assessmentId, animalId, characteristicId }: CharacteristicSuggestionInput,
  personId: string,
  now: Date,
): Promise<CharacteristicSuggestionOutcome> {
  const found = await fetchRecordedAssessment(tx, animalId, assessmentId);
  if (!found) return { ok: false, message: "Assessment not found." };
  if (found.deletedAt) {
    return {
      ok: false,
      message: "A deleted assessment can't source characteristics.",
    };
  }

  const proposal = proposalsOf(found.recorded).find(
    (p) => p.characteristicId === characteristicId,
  );
  if (!proposal) {
    return {
      ok: false,
      message: "This assessment no longer proposes that characteristic.",
    };
  }

  const existing = await tx.animalCharacteristic.findUnique({
    where: { animalId_characteristicId: { animalId, characteristicId } },
    select: { removedAt: true, sourceAssessmentId: true },
  });
  const action = suggestionActionFor(
    existing?.removedAt === null ? existing : undefined,
    assessmentId,
  );
  if (action === null) {
    return {
      ok: true,
      message: `${proposal.characteristicName} already cites this assessment.`,
    };
  }
  const wasActive = action === "CITE";

  await tx.animalCharacteristic.upsert({
    where: { animalId_characteristicId: { animalId, characteristicId } },
    create: {
      animalId,
      characteristicId,
      assignedById: personId,
      assignedAt: now,
      sourceAssessmentId: assessmentId,
    },
    update: {
      assignedById: personId,
      assignedAt: now,
      sourceAssessmentId: assessmentId,
      removedAt: null,
      removedById: null,
    },
  });

  const against = assessmentLabel(found.recorded);
  await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: AnimalActivityType.FIELD_UPDATE,
      changedById: personId,
      changeSummary: wasActive
        ? `${proposal.characteristicName} re-cited to ${against}.`
        : `${proposal.characteristicName} added, citing ${against}.`,
    },
  });

  return {
    ok: true,
    message: wasActive
      ? `${proposal.characteristicName} re-cited to this assessment.`
      : `${proposal.characteristicName} added to the animal.`,
  };
}
