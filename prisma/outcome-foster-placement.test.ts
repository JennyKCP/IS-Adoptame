









import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import prisma, { type TransactionClient } from "@/app/lib/prisma";
import {
  AnimalActivityType,
  AnimalHealthStatus,
  AnimalListingStatus,
  ApplicationSource,
  ApplicationStatus,
  FosterPlacementType,
  FosterReturnReason,
  IntakeType,
  LivingSituation,
  OutcomeType,
  Sex,
} from "@/prisma/generated/enums";
import {
  recordOutcome,
  recordOutcomeCorrection,
} from "@/app/lib/services/outcome-recording";
import { recordOutcomeReversal } from "@/app/lib/services/outcome-reversal";
import { recordReIntake } from "@/app/lib/services/intake-recording";
import {
  OutcomeFormSchema,
  type OutcomeFormOutput,
} from "@/app/lib/zod-schemas/outcome.schema";
import { ReIntakeFormSchema } from "@/app/lib/zod-schemas/intake.schema";
import {
  PreconditionFailedError,
  TimelineOrderError,
} from "@/app/lib/utils/errors";
import { assertNoListingMismatch } from "./listing-consistency";

const runId = Date.now().toString(36);

const INTAKE_DAY = "2026-01-01";
const PLACEMENT_START = "2026-01-05";

let speciesId: string;
let colorId: string;
let staffId: string;
let fosterPersonId: string;
let fosterName: string;
let fosterProfileId: string;
let otherApplicantId: string;

before(async () => {
  const person = async (name: string) =>
    (
      await prisma.person.create({
        data: { name: `${name} ${runId}` },
        select: { id: true },
      })
    ).id;
  speciesId = (
    await prisma.species.create({
      data: { name: `Outcome in foster species ${runId}` },
      select: { id: true },
    })
  ).id;
  colorId = (
    await prisma.color.create({
      data: { name: `Outcome in foster color ${runId}` },
      select: { id: true },
    })
  ).id;
  staffId = await person("Outcome in foster staff");
  fosterName = `Outcome in foster foster ${runId}`;
  fosterPersonId = await person("Outcome in foster foster");
  otherApplicantId = await person("Outcome in foster applicant");
  fosterProfileId = (
    await prisma.fosterProfile.create({
      
      data: { personId: fosterPersonId, maxAnimals: 50 },
      select: { id: true },
    })
  ).id;
});

after(async () => {
  await prisma.fosterPlacement.deleteMany({ where: { fosterProfileId } });
  await prisma.outcome.deleteMany({ where: { staffMemberId: staffId } });
  await prisma.intake.deleteMany({ where: { staffMemberId: staffId } });
  await prisma.adoptionApplication.deleteMany({
    where: { applicantId: { in: [fosterPersonId, otherApplicantId] } },
  });
  
  await prisma.animal.deleteMany({ where: { speciesId } });
  await prisma.fosterProfile.deleteMany({ where: { id: fosterProfileId } });
  await prisma.person.deleteMany({
    where: { id: { in: [staffId, fosterPersonId, otherApplicantId] } },
  });
  await prisma.color.deleteMany({ where: { id: colorId } });
  await prisma.species.deleteMany({ where: { id: speciesId } });
  await prisma.$disconnect();
});


const makeAnimal = async (
  label: string,
  placement: FosterPlacementType | null,
) => {
  const fosterToAdopt = placement === FosterPlacementType.FOSTER_TO_ADOPT;
  const animal = await prisma.animal.create({
    data: {
      name: `${label} ${runId}`,
      birthDate: "2024-01-01",
      sex: Sex.FEMALE,
      speciesId,
      primaryColorId: colorId,
      listingStatus: fosterToAdopt
        ? AnimalListingStatus.PENDING_ADOPTION
        : AnimalListingStatus.PUBLISHED,
      intake: {
        create: {
          type: IntakeType.STRAY,
          intakeDate: INTAKE_DAY,
          staffMemberId: staffId,
        },
      },
    },
    select: { id: true },
  });
  const placementId = placement
    ? (
        await prisma.fosterPlacement.create({
          data: {
            type: placement,
            startDate: PLACEMENT_START,
            animalId: animal.id,
            fosterProfileId,
            placedById: staffId,
            previousListingStatus: fosterToAdopt
              ? AnimalListingStatus.PUBLISHED
              : undefined,
          },
          select: { id: true },
        })
      ).id
    : null;
  return { animalId: animal.id, placementId };
};

const makeApplication = async (animalId: string, applicantId: string) =>
  (
    await prisma.adoptionApplication.create({
      data: {
        applicantName: `Outcome in foster applicant ${runId}`,
        applicantEmail: `outcome.foster.${runId}@example.com`,
        applicantPhone: "2125550100",
        applicantAddressLine1: "1 Main St",
        applicantCity: "New York",
        applicantState: "NY",
        applicantZipCode: "10001",
        livingSituation: LivingSituation.OWN_HOME,
        householdSize: 1,
        reasonForAdoption: "Test",
        status: ApplicationStatus.APPROVED,
        source: ApplicationSource.STAFF,
        applicantId,
        animalId,
        submittedAt: new Date("2026-01-02T12:00:00Z"),
      },
      select: { id: true },
    })
  ).id;


const values = (
  outcomeType: OutcomeType,
  outcomeDate: string,
  notes = "",
): OutcomeFormOutput =>
  OutcomeFormSchema.parse({ outcomeType, outcomeDate, notes });

const record = (
  animalId: string,
  outcomeDate: string,
  {
    type = OutcomeType.DECEASED,
    adoptionApplicationId,
  }: { type?: OutcomeType; adoptionApplicationId?: string } = {},
) =>
  prisma.$transaction((tx) =>
    recordOutcome(
      tx,
      { animalId, adoptionApplicationId, values: values(type, outcomeDate) },
      staffId,
    ),
  );

const correct = (outcomeId: string, outcomeDate: string, notes = "") =>
  recordOutcomeCorrection(
    outcomeId,
    values(OutcomeType.DECEASED, outcomeDate, notes),
    staffId,
  );

const readPlacement = (id: string) =>
  prisma.fosterPlacement.findUniqueOrThrow({
    where: { id },
    select: {
      endDate: true,
      returnReason: true,
      returnedById: true,
      outcomeId: true,
      adoptionApplicationId: true,
    },
  });

const readAnimal = async (animalId: string) => {
  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id: animalId },
    select: {
      listingStatus: true,
      currentUnitId: true,
      Outcome: {
        select: {
          id: true,
          outcomeDate: true,
          reversedAt: true,
          adoptionApplicationId: true,
        },
      },
      
      
      activityLog: {
        select: { activityType: true, changeSummary: true },
        orderBy: { changedAt: "asc" },
      },
    },
  });
  return {
    listingStatus: animal.listingStatus,
    currentUnitId: animal.currentUnitId,
    outcomes: animal.Outcome,
    activityLogs: animal.activityLog,
  };
};


const assertEndFollowsOutcome = async (animalId: string) => {
  const rows = await prisma.animalActivityLog.findMany({
    where: {
      animalId,
      activityType: {
        in: [
          AnimalActivityType.OUTCOME_PROCESSED,
          AnimalActivityType.FOSTER_RETURNED,
        ],
      },
    },
    select: { activityType: true, changedAt: true },
    orderBy: { changedAt: "asc" },
  });
  assert.deepEqual(
    rows.map((row) => row.activityType),
    [AnimalActivityType.OUTCOME_PROCESSED, AnimalActivityType.FOSTER_RETURNED],
  );
  assert.ok(rows[1].changedAt > rows[0].changedAt);
};

const onlyOutcome = async (animalId: string) => {
  const { outcomes } = await readAnimal(animalId);
  assert.equal(outcomes.length, 1);
  return outcomes[0];
};

const fosterRows = async (animalId: string) =>
  (await readAnimal(animalId)).activityLogs.filter(
    (log) => log.activityType === AnimalActivityType.FOSTER_RETURNED,
  );

const refusedBeforeStart = (error: unknown) => {
  
  if (!(error instanceof TimelineOrderError)) throw error;
  assert.equal(
    error.message,
    `The outcome date can't be before the foster placement with ${fosterName} began on Jan 5, 2026.`,
  );
  assert.equal(error.field, "outcomeDate");
  return true;
};

test("an outcome while in foster ends the placement on its day, linked to it", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Died in foster",
    FosterPlacementType.GENERAL,
  );

  const result = await record(animalId, "2026-01-10");

  assert.deepEqual(result, { fosterPersonId });
  const outcome = await onlyOutcome(animalId);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: "2026-01-10",
    returnReason: FosterReturnReason.ENDED_BY_OUTCOME,
    returnedById: staffId,
    outcomeId: outcome.id,
    adoptionApplicationId: null,
  });
  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.ARCHIVED);
  assert.equal(animal.currentUnitId, null);
  assert.deepEqual(animal.activityLogs, [
    {
      activityType: AnimalActivityType.OUTCOME_PROCESSED,
      changeSummary: "Animal was processed for outcome: deceased.",
    },
    {
      activityType: AnimalActivityType.FOSTER_RETURNED,
      changeSummary: `Foster placement with ${fosterName} ended: deceased.`,
    },
  ]);
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);
});




test("the placement's end follows the outcome even when both are written in the same millisecond", async (t) => {
  const { animalId } = await makeAnimal(
    "Died in foster, same millisecond",
    FosterPlacementType.GENERAL,
  );

  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  try {
    await record(animalId, "2026-01-10");
  } finally {
    t.mock.timers.reset();
  }

  await assertEndFollowsOutcome(animalId);
});

test("reversing that outcome reopens the placement and puts the animal in no unit", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Recorded dead in foster by mistake",
    FosterPlacementType.GENERAL,
  );
  await record(animalId, "2026-01-10");
  const { id: outcomeId } = await onlyOutcome(animalId);

  const reversal = await prisma.$transaction((tx) =>
    recordOutcomeReversal(tx, outcomeId, "Entered by mistake.", staffId),
  );
  
  await assertEndFollowsOutcome(animalId);

  assert.equal(reversal.reopenedPlacementId, placementId);
  assert.equal(reversal.fosterPersonId, fosterPersonId);
  assert.equal(reversal.restoredUnitId, null);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: null,
    returnReason: null,
    returnedById: null,
    
    outcomeId,
    adoptionApplicationId: null,
  });
  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.PUBLISHED);
  assert.equal(animal.currentUnitId, null);
  await assertNoListingMismatch(animalId);
});





test("an outcome reversed after a re-intake leaves its placement ended and linked", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Left from foster, back since",
    FosterPlacementType.GENERAL,
  );
  await record(animalId, "2026-01-10", { type: OutcomeType.OTHER });
  const { id: outcomeId } = await onlyOutcome(animalId);
  await prisma.$transaction((tx) =>
    recordReIntake(
      tx,
      {
        animalId,
        values: ReIntakeFormSchema.parse({
          intakeType: IntakeType.SEIZE,
          intakeDate: "2026-01-20",
          notes: "",
          healthStatus: AnimalHealthStatus.AWAITING_VET_EXAM,
          isSpayedNeutered: false,
        }),
      },
      staffId,
    ),
  );

  const reversal = await prisma.$transaction((tx) =>
    recordOutcomeReversal(tx, outcomeId, "Entered on the wrong stay.", staffId),
  );

  assert.equal(reversal.reopenedPlacementId, null);
  
  assert.equal(reversal.fosterPersonId, fosterPersonId);
  assert.notEqual((await onlyOutcome(animalId)).reversedAt, null);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: "2026-01-10",
    returnReason: FosterReturnReason.ENDED_BY_OUTCOME,
    returnedById: staffId,
    outcomeId,
    adoptionApplicationId: null,
  });
  const animal = await readAnimal(animalId);
  assert.equal(animal.listingStatus, AnimalListingStatus.DRAFT);
  assert.equal(animal.currentUnitId, null);
  await assertNoListingMismatch(animalId);
});

test("an outcome with no open placement touches no placement", async () => {
  const { animalId } = await makeAnimal("Died in the shelter", null);
  
  const returned = await prisma.fosterPlacement.create({
    data: {
      type: FosterPlacementType.GENERAL,
      startDate: "2026-01-02",
      endDate: "2026-01-04",
      returnReason: FosterReturnReason.RETURNED_TO_SHELTER,
      animalId,
      fosterProfileId,
      placedById: staffId,
      returnedById: staffId,
    },
    select: { id: true },
  });
  const before = await readPlacement(returned.id);

  const result = await record(animalId, "2026-01-10");

  assert.deepEqual(result, { fosterPersonId: null });
  assert.deepEqual(await readPlacement(returned.id), before);
  assert.deepEqual(await fosterRows(animalId), []);
  assert.equal(
    (await readAnimal(animalId)).listingStatus,
    AnimalListingStatus.ARCHIVED,
  );
  await assertNoListingMismatch(animalId);
});

test("an outcome dated before the placement began is refused, and nothing is written", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Backdated past the foster",
    FosterPlacementType.GENERAL,
  );
  const before = await readAnimal(animalId);
  const placementBefore = await readPlacement(placementId!);

  
  await assert.rejects(record(animalId, "2026-01-04"), refusedBeforeStart);

  assert.deepEqual(await readAnimal(animalId), before);
  assert.deepEqual(await readPlacement(placementId!), placementBefore);
  assert.equal(before.listingStatus, AnimalListingStatus.PUBLISHED);
  assert.deepEqual(before.outcomes, []);
  await assertNoListingMismatch(animalId);

  
  await record(animalId, PLACEMENT_START);
  assert.equal((await readPlacement(placementId!)).endDate, PLACEMENT_START);
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);
});

test("the foster adopting from a foster-to-adopt placement is sent to the conversion", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Foster to adopt, adopted by the foster",
    FosterPlacementType.FOSTER_TO_ADOPT,
  );
  const applicationId = await makeApplication(animalId, fosterPersonId);
  const before = await readAnimal(animalId);
  const placementBefore = await readPlacement(placementId!);

  await assert.rejects(
    record(animalId, "2026-01-10", {
      type: OutcomeType.ADOPTION,
      adoptionApplicationId: applicationId,
    }),
    (error: unknown) => {
      if (!(error instanceof PreconditionFailedError)) throw error;
      assert.equal(
        error.message,
        `${fosterName} is adopting this animal from their foster-to-adopt placement. Convert the placement to an adoption from the animal's page instead.`,
      );
      return true;
    },
  );

  assert.deepEqual(await readAnimal(animalId), before);
  assert.deepEqual(await readPlacement(placementId!), placementBefore);
  assert.equal(before.listingStatus, AnimalListingStatus.PENDING_ADOPTION);
  await assertNoListingMismatch(animalId);
});

test("the foster adopting from a general placement ends it as adopted by the foster", async () => {
  const { animalId, placementId } = await makeAnimal(
    "General foster, adopted by the foster",
    FosterPlacementType.GENERAL,
  );
  const applicationId = await makeApplication(animalId, fosterPersonId);

  await record(animalId, "2026-01-10", {
    type: OutcomeType.ADOPTION,
    adoptionApplicationId: applicationId,
  });

  const outcome = await onlyOutcome(animalId);
  
  assert.equal(outcome.adoptionApplicationId, applicationId);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: "2026-01-10",
    returnReason: FosterReturnReason.ADOPTED_BY_FOSTER,
    returnedById: staffId,
    outcomeId: outcome.id,
    adoptionApplicationId: null,
  });
  assert.deepEqual(
    (await fosterRows(animalId)).map((log) => log.changeSummary),
    [`Foster placement with ${fosterName} ended: adopted by the foster.`],
  );
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);
});

test("someone else adopting from a foster-to-adopt placement ends it as an ordinary outcome", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Foster to adopt, adopted by someone else",
    FosterPlacementType.FOSTER_TO_ADOPT,
  );
  const applicationId = await makeApplication(animalId, otherApplicantId);

  await record(animalId, "2026-01-10", {
    type: OutcomeType.ADOPTION,
    adoptionApplicationId: applicationId,
  });

  const outcome = await onlyOutcome(animalId);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: "2026-01-10",
    returnReason: FosterReturnReason.ENDED_BY_OUTCOME,
    returnedById: staffId,
    outcomeId: outcome.id,
    adoptionApplicationId: null,
  });
  assert.deepEqual(
    (await fosterRows(animalId)).map((log) => log.changeSummary),
    [`Foster placement with ${fosterName} ended: adoption.`],
  );
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);
});

test("correcting the outcome's day moves the placement's end with it, in the same row", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Died in foster, day corrected",
    FosterPlacementType.GENERAL,
  );
  await record(animalId, "2026-01-10");
  const { id: outcomeId } = await onlyOutcome(animalId);

  const result = await correct(outcomeId, "2026-01-08");

  assert.deepEqual(result, {
    status: "corrected",
    animalId,
    fosterPersonId,
  });
  assert.equal((await onlyOutcome(animalId)).outcomeDate, "2026-01-08");
  assert.equal((await readPlacement(placementId!)).endDate, "2026-01-08");
  
  assert.deepEqual((await readAnimal(animalId)).activityLogs, [
    {
      activityType: AnimalActivityType.OUTCOME_PROCESSED,
      changeSummary: "Animal was processed for outcome: deceased.",
    },
    {
      activityType: AnimalActivityType.FOSTER_RETURNED,
      changeSummary: `Foster placement with ${fosterName} ended: deceased.`,
    },
    {
      activityType: AnimalActivityType.OUTCOME_CORRECTED,
      changeSummary:
        "Outcome was corrected: the date changed from Jan 10, 2026 to Jan 8, 2026; the foster placement's end moved with it.",
    },
  ]);
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);

  
  
  const stamp = () =>
    prisma.fosterPlacement.findUniqueOrThrow({
      where: { id: placementId! },
      select: { endDate: true, updatedAt: true },
    });
  const beforeNotes = await stamp();
  const notesOnly = await correct(
    outcomeId,
    "2026-01-08",
    "Found by the foster.",
  );
  assert.equal(notesOnly.status, "corrected");
  assert.equal(notesOnly.fosterPersonId, null);
  assert.deepEqual(await stamp(), beforeNotes);
  await assertNoListingMismatch(animalId);
});

test("a correction to before the placement began is refused, and nothing is written", async () => {
  const { animalId, placementId } = await makeAnimal(
    "Died in foster, corrected too far back",
    FosterPlacementType.GENERAL,
  );
  await record(animalId, "2026-01-10");
  const { id: outcomeId } = await onlyOutcome(animalId);
  const before = await readAnimal(animalId);
  const placementBefore = await readPlacement(placementId!);

  await assert.rejects(correct(outcomeId, "2026-01-04"), refusedBeforeStart);

  assert.deepEqual(await readAnimal(animalId), before);
  assert.deepEqual(await readPlacement(placementId!), placementBefore);
  await assertNoListingMismatch(animalId);
});

test("correcting a conversion's adoption moves its placement's end too", async () => {
  
  
  const { animalId, placementId } = await makeAnimal(
    "Converted, day corrected",
    FosterPlacementType.FOSTER_TO_ADOPT,
  );
  const applicationId = await makeApplication(animalId, fosterPersonId);
  const outcome = await prisma.outcome.create({
    data: {
      animalId,
      type: OutcomeType.ADOPTION,
      outcomeDate: "2026-01-10",
      staffMemberId: staffId,
      previousListingStatus: AnimalListingStatus.PENDING_ADOPTION,
      adoptionApplicationId: applicationId,
    },
    select: { id: true },
  });
  await prisma.animal.update({
    where: { id: animalId },
    data: {
      listingStatus: AnimalListingStatus.ARCHIVED,
      archiveReason: OutcomeType.ADOPTION,
    },
  });
  await prisma.fosterPlacement.update({
    where: { id: placementId! },
    data: {
      endDate: "2026-01-10",
      returnReason: FosterReturnReason.ADOPTED_BY_FOSTER,
      returnedById: staffId,
      outcomeId: outcome.id,
      adoptionApplicationId: applicationId,
    },
  });

  const result = await recordOutcomeCorrection(
    outcome.id,
    values(OutcomeType.ADOPTION, "2026-01-12"),
    staffId,
  );

  assert.equal(result.fosterPersonId, fosterPersonId);
  assert.deepEqual(await readPlacement(placementId!), {
    endDate: "2026-01-12",
    returnReason: FosterReturnReason.ADOPTED_BY_FOSTER,
    returnedById: staffId,
    outcomeId: outcome.id,
    adoptionApplicationId: applicationId,
  });
  await assertNoListingMismatch(animalId);
});


const backendPid = async (tx: TransactionClient) =>
  (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]
    .pid;









const WAIT_DEADLINE = 15_000;
const waitForSessionBlockedBy = async (
  holderPid: number,
  stop: () => boolean,
): Promise<boolean> => {
  const deadline = Date.now() + WAIT_DEADLINE;
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






test("an outcome waiting on a placement being made closes it once it commits", async () => {
  const { animalId } = await makeAnimal("Placed while the outcome waits", null);
  
  
  const timeout = WAIT_DEADLINE + 5_000;

  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let written!: (value: { pid: number; placementId: string }) => void;
  const isWritten = new Promise<{ pid: number; placementId: string }>(
    (resolve) => (written = resolve),
  );
  
  const holder = prisma.$transaction(
    async (tx) => {
      const placement = await tx.fosterPlacement.create({
        data: {
          type: FosterPlacementType.GENERAL,
          startDate: PLACEMENT_START,
          animalId,
          fosterProfileId,
          placedById: staffId,
        },
        select: { id: true },
      });
      await tx.animal.update({
        where: { id: animalId },
        data: { currentUnitId: null },
      });
      written({ pid: await backendPid(tx), placementId: placement.id });
      await released;
    },
    { timeout },
  );
  
  const { pid, placementId } = await Promise.race([
    isWritten,
    holder as Promise<never>,
  ]);

  let outcomeSettled = false;
  const outcome = prisma
    .$transaction(
      (tx) =>
        recordOutcome(
          tx,
          {
            animalId,
            values: values(OutcomeType.DECEASED, "2026-01-10"),
          },
          staffId,
        ),
      { timeout },
    )
    .then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    )
    .finally(() => (outcomeSettled = true));
  const waited = await waitForSessionBlockedBy(pid, () => outcomeSettled).then(
    (blocked) => ({ blocked }),
    (error: unknown) => ({ error }),
  );

  
  
  release();
  const [held] = await Promise.allSettled([holder, outcome]);
  const result = await outcome;

  
  
  if (held.status === "rejected") throw held.reason;
  if ("blocked" in waited && !waited.blocked) {
    if ("error" in result) throw result.error;
    throw new Error("The outcome finished without waiting on the animal row.");
  }
  if ("error" in waited) throw waited.error;
  if ("error" in result) throw result.error;

  assert.deepEqual(result.value, { fosterPersonId });
  const { id: outcomeId } = await onlyOutcome(animalId);
  assert.deepEqual(await readPlacement(placementId), {
    endDate: "2026-01-10",
    returnReason: FosterReturnReason.ENDED_BY_OUTCOME,
    returnedById: staffId,
    outcomeId,
    adoptionApplicationId: null,
  });
  await assertEndFollowsOutcome(animalId);
  await assertNoListingMismatch(animalId);
});
