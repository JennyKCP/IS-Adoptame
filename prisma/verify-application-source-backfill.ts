
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "@/app/lib/db-url";

const MIGRATION_SQL_PATH = path.join(
  
  process.cwd(),
  "prisma/migrations/20260919174346_application_edit_audit_trail/migration.sql",
);






const STAFF_SUBMISSION_REASON =
  "Application submitted by staff on behalf of applicant.";


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

type SubmissionRow = {
  applicationId: string;
  applicantId: string;
  submitterId: string | null;
  reason: string;
  source: string;
};




const SUBMISSION_ROWS_SQL = `
  SELECT DISTINCT ON (h."application_id")
    h."application_id"      AS "applicationId",
    a."applicant_id"        AS "applicantId",
    h."changed_by_id"       AS "submitterId",
    h."statusChangeReason"  AS "reason",
    a."source"::text        AS "source"
  FROM "application_status_history" AS h
  JOIN "adoption_applications" AS a ON a."id" = h."application_id"
  ORDER BY h."application_id", h."changed_at" ASC, h."id" ASC
`;





function expectedSource(row: {
  applicantId: string;
  submitterId: string | null;
  reason: string;
}): "SELF" | "STAFF" {
  if (row.submitterId !== null) {
    return row.submitterId === row.applicantId ? "SELF" : "STAFF";
  }
  return row.reason === STAFF_SUBMISSION_REASON ? "STAFF" : "SELF";
}

async function snapshot(
  db: PrismaClient,
): Promise<{ id: string; source: string }[]> {
  return db.adoptionApplication.findMany({
    select: { id: true, source: true },
    orderBy: { id: "asc" },
  });
}

class RollbackSignal extends Error {}




type Probe = {
  label: string;
  submittedByStaff: boolean;
  orphaned: boolean;
  reason: string;
  expected: "SELF" | "STAFF";
};

const PROBES: Probe[] = [
  {
    label: "staff-entered, submitter still on file",
    submittedByStaff: true,
    orphaned: false,
    reason: STAFF_SUBMISSION_REASON,
    expected: "STAFF",
  },
  {
    label: "staff-entered, submitter since deleted",
    submittedByStaff: true,
    orphaned: true,
    reason: STAFF_SUBMISSION_REASON,
    expected: "STAFF",
  },
  {
    label: "self-submitted",
    submittedByStaff: false,
    orphaned: false,
    reason: "Application submitted by user.",
    expected: "SELF",
  },
  {
    label: "self-submitted, applicant since deleted",
    submittedByStaff: false,
    orphaned: true,
    reason: "Application submitted by user.",
    expected: "SELF",
  },
];

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

    
    
    const [applicant, staffMember] = await prisma.person.findMany({
      orderBy: { id: "asc" },
      take: 2,
      select: { id: true },
    });
    const animal = await prisma.animal.findFirst({
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (!applicant || !staffMember || !animal) {
      throw new Error(
        "Need at least two persons and one animal in the database to hang the probes off.",
      );
    }

    let resetCount = 0;
    let updateCount = 0;
    let rows: SubmissionRow[] | null = null;
    const probeIds = new Map<string, string>();

    try {
      await prisma.$transaction(
        async (tx) => {
          
          for (const probe of PROBES) {
            const submitterId = probe.submittedByStaff
              ? staffMember.id
              : applicant.id;
            const application = await tx.adoptionApplication.create({
              data: {
                applicantId: applicant.id,
                animalId: animal.id,
                applicantName: "Backfill Probe",
                applicantEmail: "backfill.probe@example.com",
                applicantPhone: "000-000-0000",
                applicantAddressLine1: "1 Probe Lane",
                applicantCity: "Probe City",
                applicantState: "NY",
                applicantZipCode: "00000",
                livingSituation: "OWN_HOME",
                householdSize: 1,
                reasonForAdoption: probe.label,
                
                
                source: "SELF",
                history: {
                  create: {
                    status: "PENDING",
                    statusChangeReason: probe.reason,
                    changedById: submitterId,
                  },
                },
              },
              select: { id: true },
            });
            probeIds.set(probe.label, application.id);

            if (probe.orphaned) {
              await tx.applicationStatusHistory.updateMany({
                where: { applicationId: application.id },
                data: { changedById: null },
              });
            }
          }

          
          
          resetCount = await tx.$executeRawUnsafe(
            `UPDATE "adoption_applications" SET "source" = 'SELF'`,
          );

          
          updateCount = await tx.$executeRawUnsafe(updateStatement);

          
          rows = await tx.$queryRawUnsafe<SubmissionRow[]>(SUBMISSION_ROWS_SQL);

          
          throw new RollbackSignal("verification complete — forcing ROLLBACK");
        },
        { timeout: 30_000 },
      );
    } catch (err) {
      if (!(err instanceof RollbackSignal)) throw err;
    }

    if (rows === null) {
      throw new Error("transaction body did not run to completion");
    }
    const submissions: SubmissionRow[] = rows;
    const byId = new Map(submissions.map((r) => [r.applicationId, r]));

    const mismatches = submissions.filter((r) => r.source !== expectedSource(r));
    const staffCount = submissions.filter((r) => r.source === "STAFF").length;

    console.log("── Backfill result (inside the rolled-back transaction) ──");
    console.log(`applications reset to SELF:         ${resetCount}`);
    console.log(`applications with a history row:    ${submissions.length}`);
    console.log(`rows touched by the backfill:       ${updateCount}`);
    console.log(`classified STAFF:                   ${staffCount}`);
    console.log(
      `classified SELF:                    ${submissions.length - staffCount}`,
    );
    console.log(
      `disagreements with the expectation: ${mismatches.length}`,
    );
    for (const m of mismatches.slice(0, 10)) {
      console.log(
        `   ${m.applicationId}: got ${m.source}, expected ${expectedSource(m)} (submitter ${m.submitterId ?? "NULL"}, reason ${JSON.stringify(m.reason)})`,
      );
    }
    console.log("\n── Probes ──");
    const probeProblems: string[] = [];
    for (const probe of PROBES) {
      const id = probeIds.get(probe.label);
      const row = id ? byId.get(id) : undefined;
      const got = row?.source ?? "(missing)";
      console.log(
        `   ${got === probe.expected ? "ok  " : "FAIL"} ${probe.label} → ${got} (expected ${probe.expected})`,
      );
      if (got !== probe.expected) {
        probeProblems.push(
          `probe "${probe.label}" classified ${got}, expected ${probe.expected}`,
        );
      }
    }
    console.log("─────────────────────────────────────────────────────────\n");

    
    const problems: string[] = [...probeProblems];
    if (resetCount !== before.length + PROBES.length) {
      problems.push(
        `reset touched ${resetCount} rows, expected ${before.length + PROBES.length}`,
      );
    }
    if (mismatches.length > 0) {
      problems.push(
        `${mismatches.length} application(s) classified against the expectation`,
      );
    }

    
    const after = await snapshot(prisma);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      problems.push(
        "adoption_applications source values changed after rollback",
      );
    }
    const probeRowsLeft = await prisma.adoptionApplication.count({
      where: { id: { in: [...probeIds.values()] } },
    });
    if (probeRowsLeft > 0) {
      problems.push(`${probeRowsLeft} probe application(s) survived the rollback`);
    }

    if (problems.length > 0) {
      console.error("FAILED:");
      for (const p of problems) console.error(`  - ${p}`);
      process.exitCode = 1;
      return;
    }

    console.log(
      "PASSED — every application is classified by its submitter, an orphaned staff submission falls back to the reason string, and the dev database is unchanged.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("verify-application-source-backfill failed:", e);
  process.exit(1);
});
