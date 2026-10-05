

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { authIdSchema, cuidSchema } from "@/app/lib/zod-schemas/common.schemas";





const BASE62 =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";


function betterAuthStyleId(seed: number, size = 32): string {
  let state = seed * 2654435761 + 1;
  let out = "";
  for (let i = 0; i < size; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    out += BASE62[state % BASE62.length];
  }
  return out;
}


const REAL_BETTER_AUTH_ID = "MRaM1HgFyo99l6YHkVlNRBC5YumDmEtU";


const PRISMA_CUID = "cjld2cjxh0000qzrmn831i7rn";





describe("authIdSchema", () => {
  test("accepts Better Auth generated ids", () => {
    for (let seed = 0; seed < 500; seed++) {
      const id = betterAuthStyleId(seed);
      const result = authIdSchema.safeParse(id);
      assert.equal(
        result.success,
        true,
        `authIdSchema rejected a Better Auth style id: ${id}`,
      );
    }
  });

  test("accepts a real Better Auth id", () => {
    assert.equal(authIdSchema.safeParse(REAL_BETTER_AUTH_ID).success, true);
  });

  test("still accepts Prisma CUIDs, so it is safe as a general id schema", () => {
    assert.equal(authIdSchema.safeParse(PRISMA_CUID).success, true);
  });

  test("rejects empty, whitespace-only, and oversized input", () => {
    for (const bad of ["", "   ", "\n", "x".repeat(65)]) {
      assert.equal(
        authIdSchema.safeParse(bad).success,
        false,
        `authIdSchema accepted junk input: ${JSON.stringify(bad)}`,
      );
    }
  });
});

describe("cuidSchema", () => {
  test("rejects Better Auth ids — this is why authIdSchema exists", () => {
    
    
    assert.equal(
      cuidSchema.safeParse(REAL_BETTER_AUTH_ID).success,
      false,
      "cuidSchema accepted a Better Auth id — the assumption behind authIdSchema no longer holds",
    );
  });

  test("accepts Prisma generated ids", () => {
    assert.equal(cuidSchema.safeParse(PRISMA_CUID).success, true);
  });
});






const AUTH_OWNED_ID_FIELDS = [
  "userId",
  "sessionId",
  "accountId",
  "verificationId",
];

const SCAN_ROOTS = ["app", "components", "lib"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "generated",
  "dist",
  "test-results",
]);

const OFFENDING_PATTERN = new RegExp(
  String.raw`\b(${AUTH_OWNED_ID_FIELDS.join("|")})\s*:\s*(cuidSchema|z\.cuid2?\(\))`,
);

function* sourceFiles(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; 
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* sourceFiles(full);
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      yield full;
    }
  }
}

describe("id validation conventions", () => {
  test("no auth-owned id is validated with a CUID schema", () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      for (const file of sourceFiles(path.resolve(process.cwd(), root))) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (OFFENDING_PATTERN.test(line)) {
            offenders.push(
              `${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`,
            );
          }
        });
      }
    }

    assert.deepEqual(
      offenders,
      [],
      [
        "Better Auth ids are not CUIDs. Use authIdSchema for these fields:",
        ...offenders.map((o) => `  ${o}`),
      ].join("\n"),
    );
  });
});
