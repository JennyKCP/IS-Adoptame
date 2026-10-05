







import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import prisma, { type TransactionClient } from "@/app/lib/prisma";
import {
  AnimalListingStatus,
  ApplicationSource,
  ApplicationStatus,
  LivingSituation,
  OutcomeType,
  Sex,
} from "@/prisma/generated/enums";
import {
  checkWithdrawal,
  recordWithdrawal,
} from "@/app/lib/services/application-withdrawal";
import { ConflictError, NotFoundError } from "@/app/lib/utils/errors";

const runId = Date.now().toString(36);
const HOUR = 60 * 60 * 1000;

let speciesId: string;
let colorId: string;
let staffId: string;
let applicantId: string;
let otherApplicantId: string;

const makePerson = async (name: string) =>
  (
    await prisma.person.create({
      data: { name: `${name} ${runId}` },
      select: { id: true },
    })
  ).id;

before(async () => {
  speciesId = (
    await prisma.species.create({
      data: { name: `Withdrawal species ${runId}` },
      select: { id: true },
    })
  ).id;
  colorId = (
    await prisma.color.create({
      data: { name: `Withdrawal color ${runId}` },
      select: { id: true },
    })
  ).id;
  staffId = await makePerson("Withdrawal staff");
  applicantId = await makePerson("Withdrawal applicant");
  otherApplicantId = await makePerson("Withdrawal other applicant");
});




after(async () => {
  try {
    const people = [staffId, applicantId, otherApplicantId].filter(Boolean);
    if (staffId) {
      await prisma.outcome.deleteMany({ where: { staffMemberId: staffId } });
    }
    if (people.length > 0) {
      await prisma.adoptionApplication.deleteMany({
        where: { applicantId: { in: people } },
      });
    }
    if (speciesId) await prisma.animal.deleteMany({ where: { speciesId } });
    await prisma.person.deleteMany({ where: { id: { in: people } } });
    if (colorId) await prisma.color.delete({ where: { id: colorId } });
    if (speciesId) await prisma.species.delete({ where: { id: speciesId } });
  } finally {
    await prisma.$disconnect();
  }
});

const makeAnimal = async (
  label: string,
  listingStatus: AnimalListingStatus = AnimalListingStatus.PUBLISHED,
) =>
  (
    await prisma.animal.create({
      data: {
        name: `${label} ${runId}`,
        birthDate: "2024-01-01",
        sex: Sex.MALE,
        speciesId,
        primaryColorId: colorId,
        listingStatus,
      },
      select: { id: true },
    })
  ).id;

const makeApplication = (
  animalId: string,
  status: ApplicationStatus,
  owner = applicantId,
) =>
  prisma.adoptionApplication.create({
    data: {
      applicantName: `Withdrawal applicant ${runId}`,
      applicantEmail: `withdrawal.${runId}@example.com`,
      applicantPhone: "2125550100",
      applicantAddressLine1: "1 Main St",
      applicantCity: "New York",
      applicantState: "NY",
      applicantZipCode: "10001",
      livingSituation: LivingSituation.OWN_HOME,
      householdSize: 1,
      reasonForAdoption: "Test",
      status,
      source: ApplicationSource.STAFF,
      applicantId: owner,
      animalId,
      submittedAt: new Date(Date.now() - HOUR),
    },
    select: { id: true, animalId: true },
  });


const recordOutcome = (
  animalId: string,
  type: OutcomeType,
  adoptionApplicationId?: string,
) =>
  prisma.outcome.create({
    data: {
      animalId,
      type,
      outcomeDate: "2026-01-01",
      staffMemberId: staffId,
      adoptionApplicationId,
    },
  });

const withdraw = async (applicationId: string, personId = applicantId) => {
  const withdrawable = await checkWithdrawal(applicationId, personId);
  await prisma.$transaction((tx) =>
    recordWithdrawal(tx, withdrawable, personId),
  );
};


const writtenFor = async (application: { id: string; animalId: string }) => ({
  status: (
    await prisma.adoptionApplication.findUniqueOrThrow({
      where: { id: application.id },
      select: { status: true },
    })
  ).status,
  history: await prisma.applicationStatusHistory.findMany({
    where: { applicationId: application.id },
    select: { status: true, statusChangeReason: true, changedById: true },
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
  }),
  listingStatus: (
    await prisma.animal.findUniqueOrThrow({
      where: { id: application.animalId },
      select: { listingStatus: true },
    })
  ).listingStatus,
});


const historyRow = () => [
  {
    status: ApplicationStatus.WITHDRAWN,
    statusChangeReason: "Application withdrawn by user.",
    changedById: applicantId,
  },
];

test("withdrawing an approved application returns the animal to Published", async () => {
  const animalId = await makeAnimal(
    "Approved",
    AnimalListingStatus.PENDING_ADOPTION,
  );
  const application = await makeApplication(
    animalId,
    ApplicationStatus.APPROVED,
  );

  await withdraw(application.id);

  assert.deepEqual(await writtenFor(application), {
    status: ApplicationStatus.WITHDRAWN,
    history: historyRow(),
    listingStatus: AnimalListingStatus.PUBLISHED,
  });
});



test("withdrawing an approved application releases only its own animal", async () => {
  const otherAnimalId = await makeAnimal(
    "Held for another",
    AnimalListingStatus.PENDING_ADOPTION,
  );
  const otherApplication = await makeApplication(
    otherAnimalId,
    ApplicationStatus.APPROVED,
    otherApplicantId,
  );
  const otherBefore = await writtenFor(otherApplication);
  const animalId = await makeAnimal(
    "Released",
    AnimalListingStatus.PENDING_ADOPTION,
  );
  const application = await makeApplication(
    animalId,
    ApplicationStatus.APPROVED,
  );

  await withdraw(application.id);

  assert.equal(
    (await writtenFor(application)).listingStatus,
    AnimalListingStatus.PUBLISHED,
  );
  assert.deepEqual(await writtenFor(otherApplication), otherBefore);
});



test("withdrawing an application that was not approved leaves the animal's listing alone", async () => {
  for (const status of [
    ApplicationStatus.PENDING,
    ApplicationStatus.REVIEWING,
    ApplicationStatus.WAITLISTED,
  ]) {
    const animalId = await makeAnimal(
      `Held ${status}`,
      AnimalListingStatus.PENDING_ADOPTION,
    );
    await makeApplication(animalId, ApplicationStatus.APPROVED, otherApplicantId);
    const application = await makeApplication(animalId, status);

    await withdraw(application.id);

    assert.deepEqual(
      await writtenFor(application),
      {
        status: ApplicationStatus.WITHDRAWN,
        history: historyRow(),
        listingStatus: AnimalListingStatus.PENDING_ADOPTION,
      },
      status,
    );
  }
});



test("an approved application's animal is released only from Pending Adoption", async () => {
  const animalId = await makeAnimal("Unlisted", AnimalListingStatus.DRAFT);
  const application = await makeApplication(
    animalId,
    ApplicationStatus.APPROVED,
  );

  await withdraw(application.id);

  assert.deepEqual(await writtenFor(application), {
    status: ApplicationStatus.WITHDRAWN,
    history: historyRow(),
    listingStatus: AnimalListingStatus.DRAFT,
  });
});

test("another person's application, or one that does not exist, is refused as not found, and nothing is written", async () => {
  const animalId = await makeAnimal("Not hers");
  const application = await makeApplication(
    animalId,
    ApplicationStatus.PENDING,
    otherApplicantId,
  );
  const before = await writtenFor(application);

  await assert.rejects(
    withdraw(application.id, applicantId),
    (error) =>
      error instanceof NotFoundError &&
      error.message === "Adoption Application not found.",
  );
  assert.deepEqual(await writtenFor(application), before);

  await assert.rejects(
    withdraw(`missing-${runId}`, applicantId),
    (error) =>
      error instanceof NotFoundError &&
      error.message === "Adoption Application not found.",
    "missing",
  );
});






test("the friendly read refuses an application that is withdrawn, rejected, adopted or closed, and nothing is written", async () => {
  const cases = [
    { label: "Withdrawn", status: ApplicationStatus.WITHDRAWN },
    { label: "Rejected", status: ApplicationStatus.REJECTED },
    {
      label: "Adopted",
      status: ApplicationStatus.APPROVED,
      outcome: OutcomeType.ADOPTION,
    },
    {
      label: "Closed",
      status: ApplicationStatus.PENDING,
      outcome: OutcomeType.TRANSFER_OUT,
    },
  ];

  for (const { label, status, outcome } of cases) {
    const animalId = await makeAnimal(`Settled ${label}`);
    const application = await makeApplication(animalId, status);
    if (outcome) {
      await recordOutcome(
        animalId,
        outcome,
        outcome === OutcomeType.ADOPTION ? application.id : undefined,
      );
      await prisma.animal.update({
        where: { id: animalId },
        data: { listingStatus: AnimalListingStatus.ARCHIVED },
      });
    }
    const before = await writtenFor(application);

    await assert.rejects(
      checkWithdrawal(application.id, applicantId),
      (error) =>
        error instanceof ConflictError &&
        error.message ===
          `Cannot withdraw application. Its status is currently "${label}".`,
      label,
    );
    assert.deepEqual(await writtenFor(application), before, label);
  }
});


const backendPid = async (tx: TransactionClient) =>
  (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]
    .pid;



const lockWaitTimeout = 20_000;


const recordOutcomeInSteps = (animalId: string) => {
  const gate = () => {
    let open!: () => void;
    const opened = new Promise<void>((resolve) => (open = resolve));
    return { open, opened };
  };
  let started!: (pid: number) => void;
  const pid = new Promise<number>((resolve) => (started = resolve));
  const recorded = gate();
  const commit = gate();
  const committed = prisma.$transaction(
    async (tx) => {
      started(await backendPid(tx));
      await tx.animal.update({
        where: { id: animalId },
        data: { listingStatus: AnimalListingStatus.ARCHIVED },
      });
      await tx.outcome.create({
        data: {
          animalId,
          type: OutcomeType.TRANSFER_OUT,
          outcomeDate: "2026-01-01",
          staffMemberId: staffId,
        },
      });
      recorded.open();
      await commit.opened;
    },
    { timeout: lockWaitTimeout },
  );
  
  
  const orFailure = <T>(opened: Promise<T>) => {
    const settled = Promise.race([opened, committed as Promise<never>]);
    void settled.catch(() => {});
    return settled;
  };
  return {
    pid: orFailure(pid),
    isRecorded: orFailure(recorded.opened),
    commit: commit.open,
    committed,
    release: commit.open,
  };
};


const waitForSessionBlockedBy = async (holderPid: number) => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [{ waiting }] = await prisma.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE ${holderPid}::int = ANY (pg_blocking_pids(pid))`;
    if (waiting > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`No session was seen waiting on backend ${holderPid}.`);
};





test("the status is re-checked behind the animal lock", async () => {
  const animalId = await makeAnimal("Leaving");
  const application = await makeApplication(
    animalId,
    ApplicationStatus.PENDING,
  );
  const withdrawable = await checkWithdrawal(application.id, applicantId);

  const outcome = recordOutcomeInSteps(animalId);
  await outcome.isRecorded;

  const write = prisma.$transaction(
    (tx) => recordWithdrawal(tx, withdrawable, applicantId),
    { timeout: lockWaitTimeout },
  );
  
  
  void write.catch(() => {});
  try {
    await waitForSessionBlockedBy(await outcome.pid);
  } catch (error) {
    outcome.release();
    await Promise.allSettled([outcome.committed, write]);
    throw error;
  }

  outcome.commit();
  await outcome.committed;
  await assert.rejects(
    write,
    (error) =>
      error instanceof ConflictError &&
      error.message ===
        'Cannot withdraw application. Its status is currently "Closed".',
  );
  assert.deepEqual(await writtenFor(application), {
    status: ApplicationStatus.PENDING,
    history: [],
    listingStatus: AnimalListingStatus.ARCHIVED,
  });
});

const STAFF_REASON = "Decided by staff while the withdrawal was in flight.";

const staffHistoryRow = (status: ApplicationStatus) => ({
  status,
  statusChangeReason: STAFF_REASON,
  changedById: staffId,
});


const staffDecides = (
  applicationId: string,
  status: ApplicationStatus,
  holdAnimalId?: string,
) =>
  prisma.$transaction(async (tx) => {
    await tx.adoptionApplication.update({
      where: { id: applicationId },
      data: { status },
    });
    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        ...staffHistoryRow(status),
        changedAt: new Date(Date.now() - 60_000),
      },
    });
    if (holdAnimalId) {
      await tx.animal.update({
        where: { id: holdAnimalId },
        data: { listingStatus: AnimalListingStatus.PENDING_ADOPTION },
      });
    }
  });




test("an application rejected after the friendly read is refused, and nothing is written", async () => {
  const animalId = await makeAnimal("Rejected meanwhile");
  const application = await makeApplication(
    animalId,
    ApplicationStatus.REVIEWING,
  );
  const withdrawable = await checkWithdrawal(application.id, applicantId);

  await staffDecides(application.id, ApplicationStatus.REJECTED);
  const before = await writtenFor(application);

  await assert.rejects(
    prisma.$transaction((tx) =>
      recordWithdrawal(tx, withdrawable, applicantId),
    ),
    (error) =>
      error instanceof ConflictError &&
      error.message ===
        'Cannot withdraw application. Its status is currently "Rejected".',
  );
  assert.deepEqual(await writtenFor(application), before);
});



test("an application approved after the friendly read still releases its animal", async () => {
  const animalId = await makeAnimal("Approved meanwhile");
  const application = await makeApplication(
    animalId,
    ApplicationStatus.REVIEWING,
  );
  const withdrawable = await checkWithdrawal(application.id, applicantId);

  await staffDecides(application.id, ApplicationStatus.APPROVED, animalId);

  await prisma.$transaction((tx) =>
    recordWithdrawal(tx, withdrawable, applicantId),
  );

  
  assert.deepEqual(await writtenFor(application), {
    status: ApplicationStatus.WITHDRAWN,
    history: [staffHistoryRow(ApplicationStatus.APPROVED), ...historyRow()],
    listingStatus: AnimalListingStatus.PUBLISHED,
  });
});





test("an application withdrawn or adopted after the friendly read is refused, and nothing more is written", async () => {
  {
    const animalId = await makeAnimal("Withdrawn meanwhile");
    const application = await makeApplication(
      animalId,
      ApplicationStatus.PENDING,
    );
    const withdrawable = await checkWithdrawal(application.id, applicantId);
    await withdraw(application.id);
    const before = await writtenFor(application);

    await assert.rejects(
      prisma.$transaction((tx) =>
        recordWithdrawal(tx, withdrawable, applicantId),
      ),
      (error) =>
        error instanceof ConflictError &&
        error.message ===
          'Cannot withdraw application. Its status is currently "Withdrawn".',
      "withdrawn",
    );
    assert.deepEqual(await writtenFor(application), before, "withdrawn");
  }
  {
    const animalId = await makeAnimal(
      "Adopted meanwhile",
      AnimalListingStatus.PENDING_ADOPTION,
    );
    const application = await makeApplication(
      animalId,
      ApplicationStatus.APPROVED,
    );
    const withdrawable = await checkWithdrawal(application.id, applicantId);
    await recordOutcome(animalId, OutcomeType.ADOPTION, application.id);
    await prisma.animal.update({
      where: { id: animalId },
      data: { listingStatus: AnimalListingStatus.ARCHIVED },
    });
    const before = await writtenFor(application);

    await assert.rejects(
      prisma.$transaction((tx) =>
        recordWithdrawal(tx, withdrawable, applicantId),
      ),
      (error) =>
        error instanceof ConflictError &&
        error.message ===
          'Cannot withdraw application. Its status is currently "Adopted".',
      "adopted",
    );
    assert.deepEqual(await writtenFor(application), before, "adopted");
  }
});



test("a withdrawal whose transaction fails afterwards leaves nothing behind", async () => {
  const animalId = await makeAnimal(
    "Rolled back",
    AnimalListingStatus.PENDING_ADOPTION,
  );
  const application = await makeApplication(
    animalId,
    ApplicationStatus.APPROVED,
  );
  const before = await writtenFor(application);
  const withdrawable = await checkWithdrawal(application.id, applicantId);

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await recordWithdrawal(tx, withdrawable, applicantId);
      throw new Error("A later step failed.");
    }),
    /A later step failed\./,
  );
  assert.deepEqual(await writtenFor(application), before);
});




test("an application gone by the time of the write is refused with the status the friendly read saw", async () => {
  const animalId = await makeAnimal("Gone");
  const application = await makeApplication(
    animalId,
    ApplicationStatus.PENDING,
  );
  const withdrawable = await checkWithdrawal(application.id, applicantId);
  await prisma.adoptionApplication.delete({ where: { id: application.id } });

  await assert.rejects(
    prisma.$transaction((tx) =>
      recordWithdrawal(tx, withdrawable, applicantId),
    ),
    (error) =>
      error instanceof ConflictError &&
      error.message ===
        'Cannot withdraw application. Its status is currently "Pending".',
  );
  assert.equal(
    await prisma.applicationStatusHistory.count({
      where: { applicationId: application.id },
    }),
    0,
  );
});
