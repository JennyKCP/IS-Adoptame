








import { test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/app/lib/prisma";

test("phoneNormalized is derived with no help from the call site", async (t) => {
  const person = await prisma.person.create({
    data: { name: "Extension Probe", phone: "(555) 123-4567" },
    select: { id: true, phoneNormalized: true },
  });

  try {
    await t.test("create", () => {
      assert.equal(person.phoneNormalized, "+15551234567");
    });

    await t.test("update with the { set: ... } wrapper", async () => {
      const updated = await prisma.person.update({
        where: { id: person.id },
        data: { phone: { set: "(212) 555-0199" } },
        select: { phoneNormalized: true },
      });
      assert.equal(updated.phoneNormalized, "+12125550199");
    });

    
    await t.test("tx.person.update inside $transaction", async () => {
      await prisma.$transaction(async (tx) => {
        await tx.person.update({
          where: { id: person.id },
          data: { phone: "555-123-4567" },
        });
      });

      const after = await prisma.person.findUniqueOrThrow({
        where: { id: person.id },
        select: { phoneNormalized: true },
      });
      assert.equal(after.phoneNormalized, "+15551234567");
    });

    await t.test("an unrelated edit does not clear the column", async () => {
      const renamed = await prisma.person.update({
        where: { id: person.id },
        data: { name: "Extension Probe (renamed)" },
        select: { phoneNormalized: true },
      });
      assert.equal(renamed.phoneNormalized, "+15551234567");
    });

    await t.test("clearing phone clears the derived column", async () => {
      const cleared = await prisma.person.update({
        where: { id: person.id },
        data: { phone: null },
        select: { phoneNormalized: true },
      });
      assert.equal(cleared.phoneNormalized, null);
    });
  } finally {
    await prisma.person.delete({ where: { id: person.id } });
    await prisma.$disconnect();
  }
});
