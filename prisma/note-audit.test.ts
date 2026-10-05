











import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "@/app/lib/prisma";
import { recordNoteMutation } from "@/app/lib/services/note-audit";
import {
  AnimalActivityType,
  NoteCategory,
  NoteEventAction,
  NoteTargetType,
  PartnerType,
  Sex,
} from "@/prisma/generated/enums";

type Fixture = Awaited<ReturnType<typeof createFixture>>;





async function createFixture() {
  const tag = randomUUID().slice(0, 8);

  const actor = await prisma.person.create({
    data: { name: `Audit Actor ${tag}` },
    select: { id: true },
  });
  const species = await prisma.species.create({
    data: { name: `Audit Species ${tag}` },
    select: { id: true },
  });
  const color = await prisma.color.create({
    data: { name: `Audit Color ${tag}` },
    select: { id: true },
  });
  const animal = await prisma.animal.create({
    data: {
      name: `Audit Animal ${tag}`,
      birthDate: "2020-01-01",
      sex: Sex.UNKNOWN,
      speciesId: species.id,
      primaryColorId: color.id,
    },
    select: { id: true },
  });
  const partner = await prisma.partner.create({
    data: { name: `Audit Partner ${tag}`, type: PartnerType.SHELTER },
    select: { id: true },
  });

  const ANIMAL_NOTE_CONTENT = "original animal note content";
  const animalNote = await prisma.animalNote.create({
    data: {
      animalId: animal.id,
      authorId: actor.id,
      category: NoteCategory.BEHAVIORAL,
      content: ANIMAL_NOTE_CONTENT,
    },
    select: { id: true },
  });
  const personNote = await prisma.personNote.create({
    data: { personId: actor.id, authorId: actor.id, content: "original person note" },
    select: { id: true },
  });
  const partnerNote = await prisma.partnerNote.create({
    data: {
      partnerId: partner.id,
      authorId: actor.id,
      content: "original partner note",
    },
    select: { id: true },
  });

  return {
    tag,
    actorId: actor.id,
    animalId: animal.id,
    partnerId: partner.id,
    speciesId: species.id,
    colorId: color.id,
    animalNoteId: animalNote.id,
    personNoteId: personNote.id,
    partnerNoteId: partnerNote.id,
    ANIMAL_NOTE_CONTENT,
  };
}

async function destroyFixture(f: Fixture) {
  
  
  await prisma.noteEvent.deleteMany({
    where: { targetId: { in: [f.animalNoteId, f.personNoteId, f.partnerNoteId] } },
  });
  await prisma.animalActivityLog.deleteMany({ where: { animalId: f.animalId } });
  await prisma.animalNote.deleteMany({ where: { animalId: f.animalId } });
  await prisma.personNote.deleteMany({ where: { personId: f.actorId } });
  await prisma.partnerNote.deleteMany({ where: { partnerId: f.partnerId } });
  await prisma.animal.delete({ where: { id: f.animalId } });
  await prisma.partner.delete({ where: { id: f.partnerId } });
  await prisma.species.delete({ where: { id: f.speciesId } });
  await prisma.color.delete({ where: { id: f.colorId } });
  await prisma.person.delete({ where: { id: f.actorId } });
}

const eventsFor = (targetId: string) =>
  prisma.noteEvent.findMany({ where: { targetId }, orderBy: { createdAt: "asc" } });

const logsFor = (animalId: string) =>
  prisma.animalActivityLog.findMany({
    where: { animalId },
    orderBy: { changedAt: "asc" },
  });

after(() => prisma.$disconnect());

test("EDITED on an animal note writes NoteEvent{EDITED} + AnimalActivityLog{NOTE_EDITED} with the category label", async () => {
  const f = await createFixture();
  try {
    await prisma.$transaction((tx) =>
      recordNoteMutation(tx, {
        targetType: NoteTargetType.ANIMAL,
        targetId: f.animalNoteId,
        action: NoteEventAction.EDITED,
        actorId: f.actorId,
        animalId: f.animalId,
        categoryLabel: "Behavioral",
      }),
    );

    const events = await eventsFor(f.animalNoteId);
    assert.equal(events.length, 1);
    assert.equal(events[0].action, NoteEventAction.EDITED);
    assert.equal(events[0].targetType, NoteTargetType.ANIMAL);
    assert.equal(events[0].actorId, f.actorId);

    const logs = await logsFor(f.animalId);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].activityType, AnimalActivityType.NOTE_EDITED);
    assert.equal(logs[0].changeSummary, "Behavioral");
    assert.equal(logs[0].changedById, f.actorId);
  } finally {
    await destroyFixture(f);
  }
});

test("CREATED writes NoteEvent{CREATED} + AnimalActivityLog{NOTE_ADDED}, and the caller leaves lastEditedAt null", async () => {
  const f = await createFixture();
  try {
    await prisma.$transaction((tx) =>
      recordNoteMutation(tx, {
        targetType: NoteTargetType.ANIMAL,
        targetId: f.animalNoteId,
        action: NoteEventAction.CREATED,
        actorId: f.actorId,
        animalId: f.animalId,
        categoryLabel: "Behavioral",
      }),
    );

    const events = await eventsFor(f.animalNoteId);
    assert.equal(events.length, 1);
    assert.equal(events[0].action, NoteEventAction.CREATED);

    const logs = await logsFor(f.animalId);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].activityType, AnimalActivityType.NOTE_ADDED);

    
    
    const note = await prisma.animalNote.findUniqueOrThrow({
      where: { id: f.animalNoteId },
      select: { lastEditedAt: true, lastEditedById: true },
    });
    assert.equal(note.lastEditedAt, null);
    assert.equal(note.lastEditedById, null);
  } finally {
    await destroyFixture(f);
  }
});

for (const { action, activityType } of [
  { action: NoteEventAction.DELETED, activityType: AnimalActivityType.NOTE_DELETED },
  { action: NoteEventAction.RESTORED, activityType: AnimalActivityType.NOTE_RESTORED },
] as const) {
  test(`${action} maps to AnimalActivityLog{${activityType}}, and the note write records the actor as last editor`, async () => {
    const f = await createFixture();
    try {
      
      await prisma.$transaction(async (tx) => {
        await tx.animalNote.update({
          where: { id: f.animalNoteId },
          data: {
            deletedAt: action === NoteEventAction.DELETED ? new Date() : null,
            lastEditedById: f.actorId,
            lastEditedAt: new Date(),
          },
        });
        await recordNoteMutation(tx, {
          targetType: NoteTargetType.ANIMAL,
          targetId: f.animalNoteId,
          action,
          actorId: f.actorId,
          animalId: f.animalId,
          categoryLabel: "Behavioral",
        });
      });

      const events = await eventsFor(f.animalNoteId);
      assert.equal(events.length, 1);
      assert.equal(events[0].action, action);

      const logs = await logsFor(f.animalId);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].activityType, activityType);

      const note = await prisma.animalNote.findUniqueOrThrow({
        where: { id: f.animalNoteId },
        select: { lastEditedById: true },
      });
      assert.equal(note.lastEditedById, f.actorId);
    } finally {
      await destroyFixture(f);
    }
  });
}

for (const targetType of [NoteTargetType.PERSON, NoteTargetType.PARTNER] as const) {
  test(`${targetType} note events are written to NoteEvent only — never AnimalActivityLog`, async () => {
    const f = await createFixture();
    const targetId =
      targetType === NoteTargetType.PERSON ? f.personNoteId : f.partnerNoteId;
    try {
      await prisma.$transaction((tx) =>
        recordNoteMutation(tx, {
          targetType,
          targetId,
          action: NoteEventAction.EDITED,
          actorId: f.actorId,
        }),
      );

      const events = await eventsFor(targetId);
      assert.equal(events.length, 1);
      assert.equal(events[0].targetType, targetType);
      assert.equal(events[0].action, NoteEventAction.EDITED);

      assert.equal((await logsFor(f.animalId)).length, 0);
    } finally {
      await destroyFixture(f);
    }
  });
}

test("recordNoteMutation throws for an ANIMAL event with no animalId (misconfigured caller)", async () => {
  const f = await createFixture();
  try {
    await assert.rejects(
      prisma.$transaction((tx) =>
        recordNoteMutation(tx, {
          targetType: NoteTargetType.ANIMAL,
          targetId: f.animalNoteId,
          action: NoteEventAction.EDITED,
          actorId: f.actorId,
          
        }),
      ),
      /animalId is required/,
    );
    
    assert.equal((await eventsFor(f.animalNoteId)).length, 0);
  } finally {
    await destroyFixture(f);
  }
});

test("a failing recordNoteMutation rolls back the note write in the same transaction", async () => {
  const f = await createFixture();
  try {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.animalNote.update({
          where: { id: f.animalNoteId },
          data: { content: "SHOULD NOT PERSIST" },
        });
        
        
        await recordNoteMutation(tx, {
          targetType: NoteTargetType.ANIMAL,
          targetId: f.animalNoteId,
          action: NoteEventAction.EDITED,
          actorId: `missing-person-${f.tag}`,
          animalId: f.animalId,
          categoryLabel: "Behavioral",
        });
      }),
    );

    const note = await prisma.animalNote.findUniqueOrThrow({
      where: { id: f.animalNoteId },
      select: { content: true },
    });
    assert.equal(note.content, f.ANIMAL_NOTE_CONTENT);
    assert.equal((await eventsFor(f.animalNoteId)).length, 0);
    assert.equal((await logsFor(f.animalId)).length, 0);
  } finally {
    await destroyFixture(f);
  }
});
