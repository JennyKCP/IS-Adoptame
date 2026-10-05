











import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import prisma, { type TransactionClient } from "@/app/lib/prisma";
import {
  AnimalActivityType,
  AnimalHealthStatus,
  AnimalListingStatus,
  IntakeType,
  OutcomeType,
  Sex,
} from "@/prisma/generated/enums";
import { recordReIntake } from "@/app/lib/services/intake-recording";
import { recordOutcomeReversal } from "@/app/lib/services/outcome-reversal";
import { lockAnimal } from "@/app/lib/data/application-status.data";
import { checkFirstIntakeDay } from "@/app/lib/data/animal-timeline.data";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import {
  ReIntakeFormSchema,
  type ReIntakeFormOutput,
} from "@/app/lib/zod-schemas/intake.schema";
import { shiftDayKey, shelterToday } from "@/app/lib/utils/shelter-day";
import { fallbackShelterSettings } from "@/app/lib/utils/shelter-settings";
import { ConflictError, TimelineOrderError } from "@/app/lib/utils/errors";
import { assertNoListingMismatch } from "./listing-consistency";

const runId = Date.now().toString(36);


const future = () =>
  shiftDayKey(shelterToday(fallbackShelterSettings().timezone), 2);

let speciesId: string;
let colorId: string;
let staffId: string;

before(async () => {
  speciesId = (
    await prisma.species.create({
      data: { name: `Re-intake day species ${runId}` },
      select: { id: true },
    })
  ).id;
  colorId = (
    await prisma.color.create({
      data: { name: `Re-intake day color ${runId}` },
      select: { id: true },
    })
  ).id;
  staffId = (
    await prisma.person.create({
      data: { name: `Re-intake day staff ${runId}` },
      select: { id: true },
    })
  ).id;
});

after(async () => {
  await prisma.outcome.deleteMany({ where: { staffMemberId: staffId } });
  await prisma.intake.deleteMany({ where: { staffMemberId: staffId } });
  
  await prisma.animal.deleteMany({ where: { speciesId } });
  await prisma.person.deleteMany({ where: { id: staffId } });
  await prisma.color.deleteMany({ where: { id: colorId } });
  await prisma.species.deleteMany({ where: { id: speciesId } });
  await prisma.$disconnect();
});

type Event = { intake: string } | { outcome: string };


const makeAnimal = async (label: string, events: Event[]) => {
  const archived = "outcome" in events[events.length - 1];
  const animal = await prisma.animal.create({
    data: {
      name: `${label} ${runId}`,
      birthDate: "2024-01-01",
      sex: Sex.FEMALE,
      speciesId,
      primaryColorId: colorId,
      listingStatus: archived
        ? AnimalListingStatus.ARCHIVED
        : AnimalListingStatus.DRAFT,
      archiveReason: archived ? OutcomeType.DECEASED : null,
    },
    select: { id: true },
  });
  const outcomeIds: string[] = [];
  for (const event of events) {
    if ("intake" in event) {
      await prisma.intake.create({
        data: {
          animalId: animal.id,
          intakeDate: event.intake,
          type: IntakeType.STRAY,
          staffMemberId: staffId,
        },
      });
    } else {
      const outcome = await prisma.outcome.create({
        data: {
          animalId: animal.id,
          outcomeDate: event.outcome,
          type: OutcomeType.DECEASED,
          staffMemberId: staffId,
        },
        select: { id: true },
      });
      outcomeIds.push(outcome.id);
    }
  }
  return { animalId: animal.id, outcomeIds };
};


const seized = (intakeDate: string): ReIntakeFormOutput =>
  ReIntakeFormSchema.parse({
    intakeType: IntakeType.SEIZE,
    intakeDate,
    notes: "",
    healthStatus: AnimalHealthStatus.AWAITING_VET_EXAM,
    isSpayedNeutered: false,
  });

const reIntake = (
  animalId: string,
  intakeDate: string,
  options?: { timeout: number },
) =>
  prisma.$transaction(
    (tx) =>
      recordReIntake(tx, { animalId, values: seized(intakeDate) }, staffId),
    options,
  );

const readAnimal = async (animalId: string) => {
  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id: animalId },
    select: {
      listingStatus: true,
      archiveReason: true,
      intake: {
        select: { intakeDate: true, type: true },
        orderBy: { intakeDate: "asc" },
      },
      activityLog: { select: { activityType: true, changeSummary: true } },
    },
  });
  return {
    listingStatus: animal.listingStatus,
    archiveReason: animal.archiveReason,
    intakes: animal.intake,
    activityLogs: animal.activityLog,
  };
};

const refusedFor = (message: string) => (error: unknown) => {
  
  if (!(error instanceof TimelineOrderError)) throw error;
  assert.equal(error.message, message);
  assert.equal(error.field, "intakeDate");
  return true;
};

test("a re-intake dated before the last outcome is refused, and nothing is written", async () => {
  const { animalId } = await makeAnimal("Back before leaving", [
    { intake: "2026-01-01" },
    { outcome: "2026-02-01" },
  ]);
  const before = await readAnimal(animalId);

  await assert.rejects(
    reIntake(animalId, "2026-01-20"),
    refusedFor(
      "The intake date can't be before the previous outcome on Feb 1, 2026.",
    ),
  );

  assert.deepEqual(await readAnimal(animalId), before);
  await assertNoListingMismatch(animalId);
});

test("a re-intake on the last outcome's day is recorded as a same-day return", async () => {
  const { animalId } = await makeAnimal("Same-day return", [
    { intake: "2026-01-01" },
    { outcome: "2026-02-01" },
  ]);

  await reIntake(animalId, "2026-02-01");

  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.DRAFT);
  assert.equal(animal.archiveReason, null);
  assert.deepEqual(
    animal.intakes.map((intake) => intake.intakeDate),
    ["2026-01-01", "2026-02-01"],
  );
  assert.deepEqual(animal.activityLogs, [
    {
      activityType: AnimalActivityType.INTAKE_PROCESSED,
      changeSummary: "Animal was re-intaked as seize.",
    },
  ]);
  await assertNoListingMismatch(animalId);
});

test("a future day is refused on re-intake", async () => {
  const { animalId } = await makeAnimal("Future return", [
    { intake: "2026-01-01" },
    { outcome: "2026-02-01" },
  ]);
  const before = await readAnimal(animalId);

  await assert.rejects(
    reIntake(animalId, future()),
    refusedFor("The intake date can't be in the future."),
  );

  assert.deepEqual(await readAnimal(animalId), before);
  await assertNoListingMismatch(animalId);
});

test("an animal in care is refused for its status, not for the day", async () => {
  const { animalId } = await makeAnimal("Still here", [
    { intake: "2026-01-01" },
  ]);
  const before = await readAnimal(animalId);

  await assert.rejects(
    reIntake(animalId, "2026-02-01"),
    (error: unknown) =>
      error instanceof ConflictError &&
      error.message ===
        "Cannot process re-intake: This animal is not currently archived or was just re-intaked.",
  );

  assert.deepEqual(await readAnimal(animalId), before);
  await assertNoListingMismatch(animalId);
});

test("an animal left with a duplicate intake by a reversal can be re-intaked", async () => {
  
  
  
  
  const { animalId, outcomeIds } = await makeAnimal("Duplicate intake", [
    { intake: "2026-01-01" },
    { outcome: "2026-02-01" },
    { intake: "2026-03-01" },
    { outcome: "2026-04-01" },
  ]);
  const reversal = await prisma.$transaction((tx) =>
    recordOutcomeReversal(
      tx,
      outcomeIds[0],
      "Entered against the wrong animal.",
      staffId,
    ),
  );
  
  assert.equal(reversal.restoredListingStatus, null);

  await reIntake(animalId, "2026-05-01");

  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.DRAFT);
  assert.deepEqual(
    animal.intakes.map((intake) => intake.intakeDate),
    ["2026-01-01", "2026-03-01", "2026-05-01"],
  );
  await assertNoListingMismatch(animalId);
});


const backendPid = async (tx: TransactionClient) =>
  (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]
    .pid;




const waitForSessionBlockedBy = async (
  holderPid: number,
  stop: () => boolean = () => false,
): Promise<boolean> => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (stop()) return false;
    const [{ waiting }] = await prisma.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE ${holderPid}::int = ANY (pg_blocking_pids(pid))`;
    if (waiting > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`No session was seen waiting on backend ${holderPid}.`);
};


const reIntakeWhileHeld = async (
  animalId: string,
  intakeDate: string,
  write: (tx: TransactionClient) => Promise<unknown>,
) => {
  const timeout = 20_000;
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let locked!: (pid: number) => void;
  const isLocked = new Promise<number>((resolve) => (locked = resolve));
  const holder = prisma.$transaction(
    async (tx) => {
      await lockAnimal(tx, animalId);
      locked(await backendPid(tx));
      await released;
      await write(tx);
    },
    { timeout },
  );
  
  const holderPid = await Promise.race([isLocked, holder as Promise<never>]);

  let reIntakeSettled = false;
  const pending = reIntake(animalId, intakeDate, { timeout })
    .then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    )
    .finally(() => (reIntakeSettled = true));
  const waited = await waitForSessionBlockedBy(
    holderPid,
    () => reIntakeSettled,
  ).then(
    (blocked) => ({ blocked }),
    (error: unknown) => ({ error }),
  );

  
  
  
  release();
  const [held] = await Promise.allSettled([holder, pending]);
  const result = await pending;

  if ("blocked" in waited && !waited.blocked) {
    if ("error" in result) throw result.error;
    throw new Error("The re-intake finished without waiting on the lock.");
  }
  if ("error" in waited) throw waited.error;
  if (held.status === "rejected") throw held.reason;
  if ("error" in result) throw result.error;
  return result.value;
};




test("a re-intake waiting on the lock is judged against an outcome day moved first", async () => {
  const { animalId, outcomeIds } = await makeAnimal("Moved while held", [
    { intake: "2026-01-01" },
    { outcome: "2026-02-01" },
  ]);

  await assert.rejects(
    reIntakeWhileHeld(animalId, "2026-02-10", (tx) =>
      tx.outcome.update({
        where: { id: outcomeIds[0] },
        data: { outcomeDate: "2026-02-20" },
      }),
    ),
    refusedFor(
      "The intake date can't be before the previous outcome on Feb 20, 2026.",
    ),
  );

  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.ARCHIVED);
  assert.deepEqual(
    animal.intakes.map((intake) => intake.intakeDate),
    ["2026-01-01"],
  );
  assert.deepEqual(animal.activityLogs, []);
  await assertNoListingMismatch(animalId);
});

test("a new animal's first intake may be dated today but not later", async () => {
  const today = await getShelterToday();

  assert.equal(await checkFirstIntakeDay(today), null);
  assert.equal(
    await checkFirstIntakeDay(shiftDayKey(today, 1)),
    "The intake date can't be in the future.",
  );
});
