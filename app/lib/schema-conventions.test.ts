import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";






const ALLOWLIST: Record<string, string> = {};

type Kind = "day" | "instant";

interface Field {
  key: string;
  type: string;
  kind: Kind;
}

function kindOf(name: string): Kind | null {
  if (name.endsWith("Date") || name.startsWith("date")) return "day";
  if (name.endsWith("At")) return "instant";
  return null;
}

const ARTICLE: Record<Kind, string> = { day: "a day", instant: "an instant" };

const EXPECTED_TYPE: Record<Kind, string> = {
  day: "String",
  instant: "DateTime",
};


function namedFields(schema: string): Field[] {
  const fields: Field[] = [];
  let model: string | null = null;
  for (const line of schema.split("\n")) {
    const open = line.match(/^model\s+(\w+)\s*\{/);
    if (open) {
      model = open[1];
      continue;
    }
    if (model === null) continue;
    if (/^\}/.test(line)) {
      model = null;
      continue;
    }
    const field = line.match(/^\s+(\w+)\s+(\w+)(\?|\[\])?(\s|$)/);
    if (!field) continue;
    const kind = kindOf(field[1]);
    if (kind) {
      fields.push({ key: `${model}.${field[1]}`, type: field[2], kind });
    }
  }
  return fields;
}


function violations(
  schema: string,
  allowlist: Record<string, string>,
): string[] {
  const fields = namedFields(schema);
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const { key, type, kind } of fields) {
    seen.add(key);
    const conforms = type === EXPECTED_TYPE[kind];
    const allowed = key in allowlist;
    if (!conforms && !allowed) {
      problems.push(
        `${key} is ${type} but its name marks it as ${ARTICLE[kind]}, which must be ${EXPECTED_TYPE[kind]}`,
      );
    }
    if (conforms && allowed) {
      problems.push(
        `${key} already follows the rule; remove its allowlist entry`,
      );
    }
  }
  for (const key of Object.keys(allowlist)) {
    if (!seen.has(key)) {
      problems.push(`allowlist entry ${key} matches no field in the schema`);
    }
  }
  for (const [key, reason] of Object.entries(allowlist)) {
    if (reason.trim() === "") {
      problems.push(`allowlist entry ${key} needs a reason`);
    }
  }
  return problems;
}

test("the schema follows the calendar-day and instant naming convention", () => {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const problems = violations(schema, ALLOWLIST);
  assert.deepEqual(
    problems,
    [],
    `Schema fields disagree with the day/instant convention. See docs/calendar-days.md.\n${problems.join("\n")}`,
  );
});

test("the check finds a field whose type crosses the boundary", () => {
  const schema = `
model Visit {
  id String @id
  visitDate DateTime
  seenAt String
  createdAt DateTime @default(now())
  checkupDate String?
}
`;
  assert.deepEqual(violations(schema, {}), [
    "Visit.visitDate is DateTime but its name marks it as a day, which must be String",
    "Visit.seenAt is String but its name marks it as an instant, which must be DateTime",
  ]);
});

test("an allowlist entry exempts its field, and goes stale once unneeded", () => {
  const schema = `
model Visit {
  visitDate DateTime
  checkupDate String
}
`;
  assert.deepEqual(
    violations(schema, {
      "Visit.visitDate": "not converted",
      "Visit.checkupDate": "not converted",
      "Visit.gone": "not converted",
    }),
    [
      "Visit.checkupDate already follows the rule; remove its allowlist entry",
      "allowlist entry Visit.gone matches no field in the schema",
    ],
  );
});
