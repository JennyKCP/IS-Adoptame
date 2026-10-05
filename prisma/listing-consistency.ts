





import assert from "node:assert/strict";
import prisma from "@/app/lib/prisma";
import { AnimalListingStatus } from "@/prisma/generated/enums";
import { findListingMismatch } from "@/app/lib/utils/stay-utils";
import { calendarDay } from "@/app/lib/utils/shelter-day";


export const readListingMismatch = async (animalId: string) => {
  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id: animalId },
    select: {
      listingStatus: true,
      intake: { select: { id: true, intakeDate: true } },
      Outcome: {
        where: { reversedAt: null },
        select: { id: true, outcomeDate: true },
      },
    },
  });
  return findListingMismatch(
    [
      ...animal.intake.map((intake) => ({
        kind: "intake" as const,
        date: calendarDay(intake.intakeDate),
        ref: intake.id,
      })),
      ...animal.Outcome.map((outcome) => ({
        kind: "outcome" as const,
        date: calendarDay(outcome.outcomeDate),
        ref: outcome.id,
      })),
    ],
    animal.listingStatus === AnimalListingStatus.ARCHIVED,
  );
};

export const assertNoListingMismatch = async (animalId: string) => {
  assert.equal(
    await readListingMismatch(animalId),
    null,
    "The animal's listing and its timeline disagree about whether it is here.",
  );
};
