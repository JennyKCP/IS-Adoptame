import prisma from "@/app/lib/prisma";
import { OutcomeType } from "@/prisma/generated/enums";
import { type StayEvent } from "@/app/lib/utils/stay-utils";
import { calendarDay } from "@/app/lib/utils/shelter-day";
import { cuidSchema } from "@/app/lib/zod-schemas/common.schemas";


export const LIVE_OUTCOME_TYPES: readonly OutcomeType[] = [
  OutcomeType.ADOPTION,
  OutcomeType.RETURN_TO_OWNER,
  OutcomeType.TRANSFER_OUT,
];


export function isLiveOutcome(type: OutcomeType): boolean {
  return LIVE_OUTCOME_TYPES.includes(type);
}


export function parseSpeciesIds(species?: string): string[] | undefined {
  if (!species) return undefined;
  const ids = species
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && cuidSchema.safeParse(s).success);
  return ids.length > 0 ? ids : undefined;
}


export function speciesWhere(speciesIds: string[] | undefined): {
  animal?: { speciesId: { in: string[] } };
} {
  return speciesIds ? { animal: { speciesId: { in: speciesIds } } } : {};
}


export type AnimalStayEvents = {
  id: string;
  name: string;
  speciesId: string;
  speciesName: string;
  events: StayEvent[];
};


export const _fetchAnimalStayEvents = async (
  speciesIds?: string[],
): Promise<AnimalStayEvents[]> => {
  try {
    const animals = await prisma.animal.findMany({
      where:
        speciesIds && speciesIds.length > 0
          ? { speciesId: { in: speciesIds } }
          : undefined,
      select: {
        id: true,
        name: true,
        speciesId: true,
        species: { select: { name: true } },
        intake: { select: { intakeDate: true } },
        Outcome: { where: { reversedAt: null }, select: { outcomeDate: true } },
      },
    });

    return animals.map((animal) => ({
      id: animal.id,
      name: animal.name,
      speciesId: animal.speciesId,
      speciesName: animal.species.name,
      events: [
        ...animal.intake.map(
          (intake): StayEvent => ({
            kind: "intake",
            date: calendarDay(intake.intakeDate),
          }),
        ),
        ...animal.Outcome.map(
          (outcome): StayEvent => ({
            kind: "outcome",
            date: calendarDay(outcome.outcomeDate),
          }),
        ),
      ],
    }));
  } catch (error) {
    console.error("Error fetching animal stay events.", error);
    throw new Error("Error fetching animal stay events.");
  }
};
