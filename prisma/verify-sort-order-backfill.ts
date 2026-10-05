
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "@/app/lib/db-url";

const MIGRATION_SQL_PATH = path.join(
  
  process.cwd(),
  "prisma/migrations/20260901033851_add_animal_image_sort_order/migration.sql",
);


function extractUpdateStatement(sql: string): string {
  const withoutComments = sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");

  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const updates = statements.filter((s) => /^UPDATE\b/i.test(s));
  if (updates.length !== 1) {
    throw new Error(
      `Expected exactly one UPDATE statement in migration.sql, found ${updates.length}.`,
    );
  }
  return updates[0];
}

interface EvalResult {
  animalCount: number;
  imageCount: number;
  contiguityViolations: { animalId: string; sortOrders: number[] }[];
  animalsWithCreatedAtTies: number;
  collidingImagePairs: number;
  maxImagesForOneAnimal: number;
}

function evaluate(
  rows: { animalId: string; sortOrder: number; createdAt: Date }[],
): EvalResult {
  const byAnimal = new Map<string, { sortOrder: number; createdAt: Date }[]>();
  for (const r of rows) {
    const arr = byAnimal.get(r.animalId);
    if (arr) arr.push(r);
    else byAnimal.set(r.animalId, [r]);
  }

  const contiguityViolations: { animalId: string; sortOrders: number[] }[] = [];
  let animalsWithCreatedAtTies = 0;
  let collidingImagePairs = 0;
  let maxImagesForOneAnimal = 0;

  for (const [animalId, imgs] of byAnimal) {
    maxImagesForOneAnimal = Math.max(maxImagesForOneAnimal, imgs.length);

    const got = imgs.map((i) => i.sortOrder).sort((a, b) => a - b);
    const want = imgs.map((_, i) => i);
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      contiguityViolations.push({ animalId, sortOrders: got });
    }

    const times = imgs.map((i) => i.createdAt.getTime());
    if (new Set(times).size < times.length) {
      animalsWithCreatedAtTies++;
      const counts = new Map<number, number>();
      for (const t of times) counts.set(t, (counts.get(t) ?? 0) + 1);
      for (const c of counts.values()) {
        if (c > 1) collidingImagePairs += (c * (c - 1)) / 2;
      }
    }
  }

  return {
    animalCount: byAnimal.size,
    imageCount: rows.length,
    contiguityViolations,
    animalsWithCreatedAtTies,
    collidingImagePairs,
    maxImagesForOneAnimal,
  };
}

async function snapshot(
  db: PrismaClient,
): Promise<{ id: string; sortOrder: number }[]> {
  return db.animalImage.findMany({
    select: { id: true, sortOrder: true },
    orderBy: { id: "asc" },
  });
}

class RollbackSignal extends Error {}

async function main() {
  if (!existsSync(MIGRATION_SQL_PATH)) {
    throw new Error(`migration.sql not found at ${MIGRATION_SQL_PATH}`);
  }

  const updateStatement = extractUpdateStatement(
    readFileSync(MIGRATION_SQL_PATH, "utf8"),
  );
  console.log("── UPDATE statement extracted from migration.sql ──");
  console.log(updateStatement);
  console.log("──────────────────────────────────────────────────\n");

  const adapter = new PrismaPg({
    connectionString: resolveDatabaseUrl("direct"),
  });
  
  
  const prisma = new PrismaClient({ adapter });

  try {
    const before = await snapshot(prisma);
    const sampleAnimalIds = await prisma.animalImage
      .groupBy({ by: ["animalId"], _count: { _all: true } })
      .then((g) =>
        g
          .filter((x) => x._count._all >= 2)
          .slice(0, 3)
          .map((x) => x.animalId),
      );

    const sampleBefore = await prisma.animalImage.findMany({
      where: { animalId: { in: sampleAnimalIds } },
      select: { animalId: true, sortOrder: true, url: true },
      orderBy: [{ animalId: "asc" }, { sortOrder: "asc" }],
    });

    let result: EvalResult | null = null;
    let resetCount = 0;
    let updateCount = 0;

    try {
      await prisma.$transaction(
        async (tx) => {
          
          
          resetCount = await tx.$executeRawUnsafe(
            'UPDATE "animal_images" SET "sort_order" = 0',
          );

          
          updateCount = await tx.$executeRawUnsafe(updateStatement);

          
          const rows = await tx.animalImage.findMany({
            select: { animalId: true, sortOrder: true, createdAt: true },
          });
          result = evaluate(rows);

          
          throw new RollbackSignal("verification complete — forcing ROLLBACK");
        },
        { timeout: 30_000 },
      );
    } catch (err) {
      if (!(err instanceof RollbackSignal)) throw err;
    }

    if (result === null) {
      throw new Error("transaction body did not run to completion");
    }
    const r: EvalResult = result;

    console.log("── Backfill result (inside the rolled-back transaction) ──");
    console.log(`rows reset to sort_order = 0:      ${resetCount}`);
    console.log(`rows touched by the backfill:      ${updateCount}`);
    console.log(`animals with images:               ${r.animalCount}`);
    console.log(`total images:                      ${r.imageCount}`);
    console.log(`max images on one animal:          ${r.maxImagesForOneAnimal}`);
    console.log(
      `animals NOT numbered 0..n-1:       ${r.contiguityViolations.length}`,
    );
    if (r.contiguityViolations.length > 0) {
      for (const v of r.contiguityViolations.slice(0, 10)) {
        console.log(`   ${v.animalId}: [${v.sortOrders.join(", ")}]`);
      }
    }
    console.log(
      `animals w/ >=2 images sharing an identical createdAt: ${r.animalsWithCreatedAtTies}`,
    );
    console.log(
      `  (colliding image pairs within those animals):       ${r.collidingImagePairs}`,
    );
    console.log("─────────────────────────────────────────────────────────\n");

    
    const problems: string[] = [];
    if (resetCount !== before.length) {
      problems.push(
        `reset touched ${resetCount} rows, expected ${before.length}`,
      );
    }
    if (updateCount !== before.length) {
      problems.push(
        `backfill touched ${updateCount} rows, expected ${before.length}`,
      );
    }
    if (r.contiguityViolations.length > 0) {
      problems.push(
        `${r.contiguityViolations.length} animal(s) not numbered 0..n-1 after backfill`,
      );
    }

    
    const after = await snapshot(prisma);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      problems.push("animal_images sort_order values changed after rollback");
    }

    const sampleAfter = await prisma.animalImage.findMany({
      where: { animalId: { in: sampleAnimalIds } },
      select: { animalId: true, sortOrder: true, url: true },
      orderBy: [{ animalId: "asc" }, { sortOrder: "asc" }],
    });
    console.log("── Sample animals, sort_order OUTSIDE the transaction ──");
    console.log("before:");
    for (const s of sampleBefore) {
      console.log(`   ${s.animalId}  #${s.sortOrder}  ${s.url}`);
    }
    console.log("after:");
    for (const s of sampleAfter) {
      console.log(`   ${s.animalId}  #${s.sortOrder}  ${s.url}`);
    }
    if (JSON.stringify(sampleBefore) !== JSON.stringify(sampleAfter)) {
      problems.push("sample animals differ before/after");
    }
    console.log("───────────────────────────────────────────────────────\n");

    if (problems.length > 0) {
      console.error("FAILED:");
      for (const p of problems) console.error(`  - ${p}`);
      process.exitCode = 1;
      return;
    }

    console.log(
      "PASSED — backfill produces contiguous 0..n-1 per animal, and the dev database is unchanged.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("verify-sort-order-backfill failed:", e);
  process.exit(1);
});
