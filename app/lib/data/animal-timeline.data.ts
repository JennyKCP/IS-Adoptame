import type { TransactionClient } from "@/app/lib/prisma";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { calendarDay, type CalendarDay } from "@/app/lib/utils/shelter-day";
import {
  evaluatePlacementBounds,
  evaluateTimelineChange,
  refuseFutureDay,
  type TimelineChange,
  type TimelineEvent,
} from "./animal-timeline";

export type { TimelineChange } from "./animal-timeline";


export async function checkTimelineChange(
  tx: TransactionClient,
  animalId: string,
  change: TimelineChange,
): Promise<string | null> {
  return evaluateTimelineChange(
    await readTimelineEvents(tx, animalId),
    change,
    await getShelterToday(),
  );
}


export async function checkPlacementsInsideStay(
  tx: TransactionClient,
  animalId: string,
  change: TimelineChange,
): Promise<string | null> {
  const placements = await tx.fosterPlacement.findMany({
    where: { animalId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      outcomeId: true,
      fosterProfile: { select: { person: { select: { name: true } } } },
    },
  });
  if (placements.length === 0) return null;

  return evaluatePlacementBounds(
    await readTimelineEvents(tx, animalId),
    placements.map((placement) => ({
      ref: placement.id,
      startDate: calendarDay(placement.startDate),
      endDate:
        placement.endDate === null ? null : calendarDay(placement.endDate),
      outcomeId: placement.outcomeId,
      fosterName: placement.fosterProfile.person.name,
    })),
    change,
  );
}


const readTimelineEvents = async (
  tx: TransactionClient,
  animalId: string,
): Promise<TimelineEvent[]> => {
  const intakes = await tx.intake.findMany({
    where: { animalId },
    select: { id: true, intakeDate: true },
  });
  
  
  const outcomes = await tx.outcome.findMany({
    where: { animalId, reversedAt: null },
    select: { id: true, outcomeDate: true },
  });

  return [
    ...intakes.map((intake) => ({
      kind: "intake" as const,
      date: calendarDay(intake.intakeDate),
      ref: intake.id,
    })),
    ...outcomes.map((outcome) => ({
      kind: "outcome" as const,
      date: calendarDay(outcome.outcomeDate),
      ref: outcome.id,
    })),
  ];
};


export async function checkFirstIntakeDay(
  day: CalendarDay,
): Promise<string | null> {
  return refuseFutureDay("intake", day, await getShelterToday());
}
