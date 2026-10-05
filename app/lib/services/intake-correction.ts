import type { TransactionClient } from "@/app/lib/prisma";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import {
  checkPlacementsInsideStay,
  checkTimelineChange,
} from "@/app/lib/data/animal-timeline.data";
import { AnimalActivityType, IntakeType } from "@/prisma/generated/enums";
import { NotFoundError } from "@/app/lib/utils/errors";
import {
  calendarDay,
  formatShelterDay,
  parseCalendarDay,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";
import type { IntakeCorrectionFormOutput } from "@/app/lib/zod-schemas/intake.schema";




export interface IntakeCorrectionValues {
  intakeDate: CalendarDay;
  type: IntakeType;
  notes: string | null;
  sourcePartnerId: string | null;
  surrenderingPersonId: string | null;
  foundAddress: string | null;
  foundCity: string | null;
  foundState: string | null;
}

export type IntakeCorrection =
  | { status: "corrected"; animalId: string; changeSummary: string }
  | { status: "unchanged"; animalId: string }
  
  | { status: "refused"; animalId: string; message: string };


export const toIntakeCorrectionValues = (
  data: IntakeCorrectionFormOutput,
): IntakeCorrectionValues => {
  const type = data.intakeType;
  const isStray = type === IntakeType.STRAY;
  return {
    intakeDate: data.intakeDate,
    type,
    notes: data.notes || null,
    sourcePartnerId:
      type === IntakeType.TRANSFER_IN ? data.sourcePartnerId || null : null,
    surrenderingPersonId:
      type === IntakeType.OWNER_SURRENDER
        ? data.surrenderingPersonId || null
        : null,
    foundAddress: isStray ? data.foundAddress || null : null,
    foundCity: isStray ? data.foundCity || null : null,
    foundState: isStray ? data.foundState || null : null,
  };
};

const humanise = (type: IntakeType) => type.replace(/_/g, " ").toLowerCase();




type UnexposedStrayColumns = {
  dateLost: string | null;
  foundZipCode: string | null;
  foundByPersonId: string | null;
};

type IntakeColumns = IntakeCorrectionValues & UnexposedStrayColumns;


const joinList = (items: string[]) =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;










const describeIntakeCorrection = async (
  tx: TransactionClient,
  before: IntakeColumns,
  after: IntakeColumns,
): Promise<string | null> => {
  const changes: string[] = [];
  const fromTo = (label: string, from: string | null, to: string | null) =>
    `the ${label} changed from ${from ?? "none"} to ${to ?? "none"}`;

  if (before.intakeDate !== after.intakeDate) {
    changes.push(
      fromTo(
        "date",
        formatShelterDay(before.intakeDate),
        formatShelterDay(after.intakeDate),
      ),
    );
  }

  if (before.type !== after.type) {
    changes.push(fromTo("type", humanise(before.type), humanise(after.type)));
  }

  if (before.sourcePartnerId !== after.sourcePartnerId) {
    const ids = [before.sourcePartnerId, after.sourcePartnerId].filter(
      (id): id is string => !!id,
    );
    const partners = await tx.partner.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) =>
      partners.find((partner) => partner.id === id)?.name ?? null;
    changes.push(
      after.type !== IntakeType.TRANSFER_IN
        ? `the source partner was cleared (was ${nameOf(before.sourcePartnerId) ?? "none"})`
        : fromTo(
            "source partner",
            nameOf(before.sourcePartnerId),
            nameOf(after.sourcePartnerId),
          ),
    );
  }

  const personIds = [
    before.surrenderingPersonId,
    after.surrenderingPersonId,
    before.foundByPersonId,
  ].filter((id): id is string => !!id);
  const people =
    before.surrenderingPersonId !== after.surrenderingPersonId ||
    before.foundByPersonId !== after.foundByPersonId
      ? await tx.person.findMany({
          where: { id: { in: personIds } },
          select: { id: true, name: true },
        })
      : [];
  const personName = (id: string | null) =>
    people.find((person) => person.id === id)?.name ?? null;

  if (before.surrenderingPersonId !== after.surrenderingPersonId) {
    changes.push(
      after.type !== IntakeType.OWNER_SURRENDER
        ? `the surrendering person was cleared (was ${personName(before.surrenderingPersonId) ?? "none"})`
        : fromTo(
            "surrendering person",
            personName(before.surrenderingPersonId),
            personName(after.surrenderingPersonId),
          ),
    );
  }

  const foundFields = [
    ["address", "foundAddress"],
    ["city", "foundCity"],
    ["state", "foundState"],
    ["zip code", "foundZipCode"],
  ] as const;
  if (after.type === IntakeType.STRAY) {
    
    for (const [label, key] of foundFields) {
      if (before[key] !== after[key]) {
        changes.push(fromTo(`found ${label}`, before[key], after[key]));
      }
    }
  } else {
    
    
    const cleared = foundFields.filter(([, key]) => before[key] !== null);
    if (cleared.length > 0) {
      const labels = joinList(cleared.map(([label]) => label));
      const values = cleared.map(([, key]) => before[key]).join(", ");
      changes.push(
        cleared.length === 1
          ? `the found ${labels} was cleared (was ${values})`
          : `the found ${labels} were cleared (were ${values})`,
      );
    }
  }

  if (before.dateLost !== after.dateLost) {
    const day = before.dateLost && parseCalendarDay(before.dateLost);
    changes.push(
      `the date lost was cleared (was ${day ? formatShelterDay(day) : before.dateLost})`,
    );
  }

  if (before.foundByPersonId !== after.foundByPersonId) {
    changes.push(
      `the person who found the animal was cleared (was ${personName(before.foundByPersonId) ?? "none"})`,
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
    ? `Intake was corrected: ${changes.join("; ")}.`
    : null;
};




const blankToNull = (value: string | null) => value || null;


export async function recordIntakeCorrection(
  tx: TransactionClient,
  intakeId: string,
  next: IntakeCorrectionValues,
  changedById: string,
): Promise<IntakeCorrection> {
  
  const located = await tx.intake.findUnique({
    where: { id: intakeId },
    select: { animalId: true },
  });
  if (!located) {
    throw new NotFoundError("Error: Intake record not found.");
  }
  const { animalId } = located;

  
  
  
  await lockAnimal(tx, animalId);

  const stored = await tx.intake.findUniqueOrThrow({
    where: { id: intakeId },
    select: {
      intakeDate: true,
      type: true,
      notes: true,
      sourcePartnerId: true,
      surrenderingPersonId: true,
      foundAddress: true,
      foundCity: true,
      foundState: true,
      dateLost: true,
      foundZipCode: true,
      foundByPersonId: true,
    },
  });
  const before: IntakeColumns = {
    intakeDate: calendarDay(stored.intakeDate),
    type: stored.type,
    notes: blankToNull(stored.notes),
    sourcePartnerId: stored.sourcePartnerId,
    surrenderingPersonId: stored.surrenderingPersonId,
    foundAddress: blankToNull(stored.foundAddress),
    foundCity: blankToNull(stored.foundCity),
    foundState: blankToNull(stored.foundState),
    dateLost: blankToNull(stored.dateLost),
    foundZipCode: blankToNull(stored.foundZipCode),
    foundByPersonId: stored.foundByPersonId,
  };
  const isStray = next.type === IntakeType.STRAY;
  const after: IntakeColumns = {
    ...next,
    dateLost: isStray ? before.dateLost : null,
    foundZipCode: isStray ? before.foundZipCode : null,
    foundByPersonId: isStray ? before.foundByPersonId : null,
  };

  
  
  
  const changeSummary = await describeIntakeCorrection(tx, before, after);
  if (!changeSummary) {
    return { status: "unchanged", animalId };
  }

  if (before.intakeDate !== after.intakeDate) {
    const change = {
      kind: "moveIntake",
      intakeId,
      day: after.intakeDate,
    } as const;
    
    
    const refusal =
      (await checkTimelineChange(tx, animalId, change)) ??
      (await checkPlacementsInsideStay(tx, animalId, change));
    if (refusal) {
      return { status: "refused", animalId, message: refusal };
    }
  }

  
  
  
  await tx.intake.update({ where: { id: intakeId }, data: after });

  await tx.animalActivityLog.create({
    data: {
      animalId,
      activityType: AnimalActivityType.INTAKE_CORRECTED,
      changedById,
      changeSummary,
    },
  });

  return { status: "corrected", animalId, changeSummary };
}
