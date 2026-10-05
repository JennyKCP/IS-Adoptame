




import { after, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/auth.options";


const runId = Date.now().toString(36);






after(() => prisma.$disconnect());

test("Person.email is lowercased with no help from the call site", async (t) => {
  const email = `Extension.Probe.${runId}@Example.com`;
  const person = await prisma.person.create({
    data: { name: "Email Probe", email },
    select: { id: true, email: true },
  });

  try {
    await t.test("create", () => {
      assert.equal(person.email, email.toLowerCase());
    });

    await t.test("update with the { set: ... } wrapper", async () => {
      const updated = await prisma.person.update({
        where: { id: person.id },
        data: { email: { set: `Renamed.${runId}@Example.com` } },
        select: { email: true },
      });
      assert.equal(updated.email, `renamed.${runId}@example.com`);
    });

    await t.test("tx.person.update inside $transaction", async () => {
      await prisma.$transaction(async (tx) => {
        await tx.person.update({
          where: { id: person.id },
          data: { email: `InTx.${runId}@Example.com` },
        });
      });

      const refetched = await prisma.person.findUniqueOrThrow({
        where: { id: person.id },
        select: { email: true },
      });
      assert.equal(refetched.email, `intx.${runId}@example.com`);
    });

    await t.test("an unrelated edit does not touch the column", async () => {
      const renamed = await prisma.person.update({
        where: { id: person.id },
        data: { name: "Email Probe (renamed)" },
        select: { email: true },
      });
      assert.equal(renamed.email, `intx.${runId}@example.com`);
    });

    await t.test("clearing email preserves null", async () => {
      const cleared = await prisma.person.update({
        where: { id: person.id },
        data: { email: null },
        select: { email: true },
      });
      assert.equal(cleared.email, null);
    });

    
    
    await t.test("a case-variant of an existing email is rejected", async () => {
      await prisma.person.update({
        where: { id: person.id },
        data: { email: `Twin.${runId}@Example.com` },
      });
      await assert.rejects(
        prisma.person.create({
          data: { name: "Twin", email: `TWIN.${runId}@example.com` },
        }),
        { code: "P2002" },
      );
    });
  } finally {
    await prisma.person.delete({ where: { id: person.id } });
  }
});




test("the sign-up hook links a Person recorded with a mixed-case email", async () => {
  const staffTyped = `Link.Probe.${runId}@Example.com`;
  const providerReported = staffTyped.toLowerCase();

  const existing = await prisma.person.create({
    data: { name: "Link Probe", email: staffTyped },
    select: { id: true },
  });

  try {
    const before = authOptions(prisma).databaseHooks.user.create.before;
    const result = await before({
      id: "unused",
      name: "Link Probe",
      email: providerReported,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.deepEqual(result, {
      data: { personId: existing.id, emailVerified: true },
    });

    const notes = await prisma.personNote.findMany({
      where: { personId: existing.id },
      select: { content: true },
    });
    assert.equal(notes.length, 1);
    assert.match(notes[0].content, /Auto-linked on account creation/);

    const rows = await prisma.person.count({ where: { email: providerReported } });
    assert.equal(rows, 1);
  } finally {
    await prisma.personNote.deleteMany({ where: { personId: existing.id } });
    await prisma.person.delete({ where: { id: existing.id } });
  }
});





test("the sign-up hook lowercases its own input rather than trusting the caller", async () => {
  const mixedCase = `Hook.Probe.${runId}@Example.com`;

  const existing = await prisma.person.create({
    data: { name: "Hook Probe", email: mixedCase },
    select: { id: true },
  });

  try {
    const before = authOptions(prisma).databaseHooks.user.create.before;
    const result = await before({
      id: "unused",
      name: "Hook Probe",
      email: mixedCase,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.deepEqual(result, {
      data: { personId: existing.id, emailVerified: true },
    });

    const [note] = await prisma.personNote.findMany({
      where: { personId: existing.id },
      select: { content: true },
    });
    assert.ok(note.content.includes(`(${mixedCase.toLowerCase()})`));
  } finally {
    await prisma.personNote.deleteMany({ where: { personId: existing.id } });
    await prisma.person.delete({ where: { id: existing.id } });
  }
});

test("User.email is lowercased with no help from the call site", async () => {
  const person = await prisma.person.create({
    data: { name: "User Email Probe" },
    select: { id: true },
  });
  const user = await prisma.user.create({
    data: {
      name: "User Email Probe",
      email: `User.Probe.${runId}@Example.com`,
      personId: person.id,
    },
    select: { id: true, email: true },
  });

  try {
    assert.equal(user.email, `user.probe.${runId}@example.com`);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: `Changed.${runId}@Example.com` },
      select: { email: true },
    });
    assert.equal(updated.email, `changed.${runId}@example.com`);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.person.delete({ where: { id: person.id } });
  }
});











test("the sign-up hook reports the collision its fallback create can hit", async () => {
  const contested = `Contested.${runId}@Example.com`;

  const owner = await prisma.person.create({
    data: { name: "Record Owner", email: contested },
    select: { id: true },
  });
  const ownersAccount = await prisma.user.create({
    data: {
      name: "Record Owner",
      email: `owner.${runId}@example.com`,
      personId: owner.id,
    },
    select: { id: true },
  });

  try {
    const before = authOptions(prisma).databaseHooks.user.create.before;
    await assert.rejects(
      () =>
        before({
          id: "unused",
          name: "Rightful Owner",
          email: contested,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      (error: unknown) => {
        const named = error as { statusCode?: number; message?: string };
        assert.equal(named.statusCode, 409);
        assert.match(String(named.message), /already recorded on a shelter record/);
        
        
        assert.ok(String(named.message).includes(contested.toLowerCase()));
        return true;
      },
    );

    
    
    const rows = await prisma.person.count({
      where: { email: contested.toLowerCase() },
    });
    assert.equal(rows, 1);
  } finally {
    await prisma.user.delete({ where: { id: ownersAccount.id } });
    await prisma.person.delete({ where: { id: owner.id } });
  }
});











test("an unverified sign-up is not told whose address collided", async () => {
  const contested = `Unverified.${runId}@Example.com`;

  const onRecord = await prisma.person.create({
    data: { name: "On A Shelter Record", email: contested },
    select: { id: true },
  });

  try {
    const before = authOptions(prisma).databaseHooks.user.create.before;
    await assert.rejects(
      () =>
        before({
          id: "unused",
          name: "Unverified Caller",
          email: contested,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      (error: unknown) => {
        const named = error as { statusCode?: number; message?: string };
        
        
        assert.equal(named.statusCode, 409);
        assert.doesNotMatch(
          String(named.message),
          /already recorded on a shelter record/,
        );
        assert.ok(!String(named.message).includes(contested.toLowerCase()));
        assert.ok(!String(named.message).includes(contested));
        return true;
      },
    );

    
    
    const rows = await prisma.person.findMany({
      where: { email: contested.toLowerCase() },
      select: { id: true, user: { select: { id: true } } },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, onRecord.id);
    assert.equal(rows[0].user, null);
  } finally {
    await prisma.person.delete({ where: { id: onRecord.id } });
  }
});
