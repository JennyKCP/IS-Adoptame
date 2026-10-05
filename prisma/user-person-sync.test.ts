







import { after, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/app/lib/prisma";
import {
  findEmailConflict,
  syncPersonToUser,
} from "@/app/lib/services/user-person-sync";

const runId = Date.now().toString(36);

after(() => prisma.$disconnect());


const makeLinked = async (label: string, email: string) => {
  const person = await prisma.person.create({
    data: { name: label, email },
    select: { id: true },
  });
  const user = await prisma.user.create({
    data: { name: label, email, emailVerified: true, personId: person.id },
    select: { id: true },
  });
  return { personId: person.id, userId: user.id };
};

const cleanup = async (personIds: string[]) => {
  
  await prisma.user.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.person.deleteMany({ where: { id: { in: personIds } } });
};





test("a new login address is never inherited as verified", async () => {
  const { personId } = await makeLinked("Sync Probe", `Sync.${runId}@Example.com`);

  try {
    await syncPersonToUser(prisma, personId, {
      name: "Sync Probe",
      email: `Moved.${runId}@Example.com`,
    });

    const moved = await prisma.user.findUniqueOrThrow({
      where: { personId },
      select: { email: true, emailVerified: true },
    });
    assert.equal(moved.email, `moved.${runId}@example.com`);
    assert.equal(moved.emailVerified, false);

    
    
    await prisma.user.update({ where: { personId }, data: { emailVerified: true } });
    await syncPersonToUser(prisma, personId, {
      name: "Renamed Only",
      email: `MOVED.${runId}@EXAMPLE.COM`,
    });

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { personId },
      select: { email: true, emailVerified: true, name: true },
    });
    assert.equal(unchanged.emailVerified, true);
    assert.equal(unchanged.name, "Renamed Only", "the name still syncs");

    
    
    await syncPersonToUser(prisma, personId, { name: "Renamed Only", email: null });
    const kept = await prisma.user.findUniqueOrThrow({
      where: { personId },
      select: { email: true, emailVerified: true },
    });
    assert.equal(kept.email, `moved.${runId}@example.com`);
    assert.equal(kept.emailVerified, true);
  } finally {
    await cleanup([personId]);
  }
});

test("a person with no account is a no-op, not a missing-row error", async () => {
  const walkIn = await prisma.person.create({
    data: { name: "Walk In", email: `walkin.${runId}@example.com` },
    select: { id: true },
  });

  try {
    await syncPersonToUser(prisma, walkIn.id, {
      name: "Walk In",
      email: `walkin.${runId}@example.com`,
    });
  } finally {
    await cleanup([walkIn.id]);
  }
});






test("findEmailConflict asks both unique indexes", async () => {
  const subject = await prisma.person.create({
    data: { name: "Subject", email: `subject.${runId}@example.com` },
    select: { id: true },
  });
  const other = await prisma.person.create({
    data: { name: "Other Person", email: `other.${runId}@example.com` },
    select: { id: true },
  });
  const orphan = await prisma.person.create({
    data: { name: "Orphan Holder", email: null },
    select: { id: true },
  });
  await prisma.user.create({
    data: {
      name: "Orphan Holder",
      email: `orphan.${runId}@example.com`,
      personId: orphan.id,
    },
  });

  try {
    assert.equal(
      await findEmailConflict(prisma, `OTHER.${runId}@Example.com`, subject.id),
      "person",
    );
    assert.equal(
      await findEmailConflict(prisma, `Orphan.${runId}@Example.com`, subject.id),
      "user",
      "an address on a User and no Person is still taken",
    );
    assert.equal(
      await findEmailConflict(prisma, `subject.${runId}@example.com`, subject.id),
      null,
      "a person does not conflict with themselves",
    );
    assert.equal(await findEmailConflict(prisma, "", subject.id), null);
    assert.equal(await findEmailConflict(prisma, null, subject.id), null);
  } finally {
    await cleanup([subject.id, other.id, orphan.id]);
  }
});
