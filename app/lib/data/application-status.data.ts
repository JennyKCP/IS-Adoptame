import prisma, { type TransactionClient } from "@/app/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { ApplicationStatus, OutcomeType } from "@/prisma/generated/enums";
import type { StatusHistoryEntry } from "@/app/lib/types";
import {
  ApplicationConsequence,
  deriveApplicationConsequence,
  deriveApplicationStatuses,
  isReviewStatus,
  toDerivationOutcome,
  type EffectiveApplicationStatus,
} from "../utils/derive-application-status";
import {
  STATUS_SORT_RANK,
  adoptionReason,
  closureReason,
} from "../utils/application-status";






export const DERIVATION_APPLICATION_SELECT = {
  id: true,
  status: true,
  submittedAt: true,
  animalId: true,
} satisfies Prisma.AdoptionApplicationSelect;

export type DerivationApplicationRow = Prisma.AdoptionApplicationGetPayload<{
  select: typeof DERIVATION_APPLICATION_SELECT;
}>;

type OutcomeReader = Pick<TransactionClient, "outcome">;


export const lockPerson = (tx: TransactionClient, personId: string) =>
  tx.$queryRaw`SELECT id FROM persons WHERE id = ${personId} FOR NO KEY UPDATE`;


export const lockAnimal = (tx: TransactionClient, animalId: string) =>
  tx.$queryRaw`SELECT id FROM animals WHERE id = ${animalId} FOR NO KEY UPDATE`;


export async function effectiveApplicationStatuses(
  applications: readonly DerivationApplicationRow[],
  db: OutcomeReader = prisma,
): Promise<Map<string, EffectiveApplicationStatus>> {
  const animalIds = [...new Set(applications.map((a) => a.animalId))];
  const outcomes =
    animalIds.length === 0
      ? []
      : await db.outcome.findMany({
          where: { animalId: { in: animalIds } },
          select: {
            animalId: true,
            createdAt: true,
            type: true,
            adoptionApplicationId: true,
            reversedAt: true,
          },
        });

  return deriveApplicationStatuses(
    applications,
    outcomes.map(toDerivationOutcome),
  );
}

export async function effectiveApplicationStatus(
  application: DerivationApplicationRow,
  db: OutcomeReader = prisma,
): Promise<EffectiveApplicationStatus> {
  const statuses = await effectiveApplicationStatuses([application], db);
  return statuses.get(application.id)!;
}


export async function withConsequenceInHistory<
  Row extends DerivationApplicationRow & { history: StatusHistoryEntry[] },
>(
  application: Row,
  { includeReversals = false, db = prisma }: {
    includeReversals?: boolean;
    db?: OutcomeReader;
  } = {},
): Promise<
  Omit<Row, "status" | "history"> & {
    status: EffectiveApplicationStatus;
    history: StatusHistoryEntry[];
  }
> {
  const outcomes = await db.outcome.findMany({
    where: { animalId: application.animalId },
    select: {
      id: true,
      createdAt: true,
      type: true,
      adoptionApplicationId: true,
      staffMember: { select: { name: true } },
      fosterPlacement: { select: { id: true } },
      reversedAt: true,
      reversedBy: { select: { name: true } },
      reversalReason: true,
    },
    
    
    
    
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const derivationApplication = {
    id: application.id,
    reviewStatus: application.status,
    submittedAt: application.submittedAt,
  };
  const reviewStatusAt = (at: Date): ApplicationStatus => {
    const earlier = application.history
      .filter(
        (entry) =>
          entry.changedAt.getTime() <= at.getTime() &&
          isReviewStatus(entry.status),
      )
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0];
    if (earlier) return earlier.status as ApplicationStatus;

    
    
    return application.history.some((entry) => entry.changedAt > at)
      ? ApplicationStatus.PENDING
      : application.status;
  };
  const applicationAt = (at: Date) => ({
    ...derivationApplication,
    reviewStatus: reviewStatusAt(at),
  });
  const derivationOutcomes = outcomes.map(toDerivationOutcome);
  const consequence = deriveApplicationConsequence(
    derivationApplication,
    derivationOutcomes,
  );
  if (!consequence && !includeReversals) {
    return { ...application, status: application.status };
  }

  const outcomeEntry = (
    outcome: Pick<
      (typeof outcomes)[number],
      "id" | "type" | "fosterPlacement" | "createdAt" | "staffMember"
    >,
    status: ApplicationConsequence,
  ): StatusHistoryEntry => ({
    id: `outcome-${outcome.id}`,
    status,
    statusChangeReason:
      status === ApplicationConsequence.ADOPTED
        ? adoptionReason({ byFoster: outcome.fosterPlacement !== null })
        : closureReason({
            type: outcome.type,
            byFoster: outcome.fosterPlacement !== null,
          }),
    changedAt: outcome.createdAt,
    changedBy: outcome.staffMember,
  });
  const events: { entry: StatusHistoryEntry; order: number }[] = [];
  if (consequence) {
    events.push({
      entry: outcomeEntry(consequence.outcome, consequence.status),
      order:
        outcomes.findIndex((outcome) => outcome.id === consequence.outcome.id) *
        2,
    });
  }

  if (includeReversals) {
    for (const [index, outcome] of outcomes.entries()) {
      const reversedAt = outcome.reversedAt;
      if (!reversedAt) continue;
      
      
      
      const atRecording = deriveApplicationConsequence(
        applicationAt(outcome.createdAt),
        derivationOutcomes.slice(0, index + 1).map((row, rowIndex) =>
          rowIndex === index
            ? { ...row, reversed: false }
            : {
                ...row,
                reversed:
                  outcomes[rowIndex].reversedAt !== null &&
                  outcomes[rowIndex].reversedAt <= outcome.createdAt,
              },
        ),
      );
      const beforeReversal = deriveApplicationConsequence(
        applicationAt(reversedAt),
        outcomes
          .filter((row) => row.createdAt <= reversedAt)
          .map((row) => ({
            ...toDerivationOutcome(row),
            reversed:
              row.id !== outcome.id &&
              row.reversedAt !== null &&
              row.reversedAt <= reversedAt,
          })),
      );
      const caused =
        atRecording?.outcome.id === outcome.id
          ? atRecording
          : beforeReversal;
      if (caused?.outcome.id !== outcome.id) continue;

      const statusAfterReversal = reviewStatusAt(reversedAt);
      const remainingConsequence = deriveApplicationConsequence(
        applicationAt(reversedAt),
        outcomes
          .filter((row) => row.createdAt <= reversedAt)
          .map((row) => ({
            ...toDerivationOutcome(row),
            reversed: row.reversedAt !== null && row.reversedAt <= reversedAt,
          })),
      );
      const reopened =
        caused.status === ApplicationConsequence.CLOSED &&
        remainingConsequence === null &&
        statusAfterReversal !== ApplicationStatus.REJECTED &&
        statusAfterReversal !== ApplicationStatus.WITHDRAWN;
      const reason = outcome.reversalReason ?? "Reason not recorded.";
      events.push({
        entry: outcomeEntry(outcome, caused.status),
        order: index * 2,
      });
      events.push({
        entry: {
          id: `reversal-${outcome.id}`,
          status: caused.status,
          event: reopened ? "reopened" : "reversal",
          statusChangeReason:
            caused.status === ApplicationConsequence.ADOPTED
              ? `Adoption outcome reversed: ${reason}`
              : reopened
                ? outcome.type === OutcomeType.ADOPTION
                  ? `Reopened: the adoption that closed this application was reversed: ${reason}`
                  : `Reopened: the outcome that closed this application was reversed: ${reason}`
                : outcome.type === OutcomeType.ADOPTION
                  ? `The adoption that closed this application was reversed: ${reason}`
                  : `The outcome that closed this application was reversed: ${reason}`,
          changedAt: reversedAt,
          changedBy: outcome.reversedBy,
        },
        order: index * 2 + 1,
      });
    }
  }

  return {
    ...application,
    status: consequence?.status ?? application.status,
    history: [
      ...events,
      ...application.history.map((entry) => ({ entry, order: -1 })),
    ]
      .sort(
        (a, b) =>
          b.entry.changedAt.getTime() - a.entry.changedAt.getTime() ||
          b.order - a.order,
      )
      .map(({ entry }) => entry),
  };
}


export async function effectiveStatusBehindLock(
  tx: TransactionClient,
  application: { id: string; animalId: string },
): Promise<EffectiveApplicationStatus | null> {
  await lockAnimal(tx, application.animalId);
  const row = await tx.adoptionApplication.findUnique({
    where: { id: application.id },
    select: DERIVATION_APPLICATION_SELECT,
  });
  return row && effectiveApplicationStatus(row, tx);
}

export type ApplicationPage = {
  ids: string[];
  statusById: Map<string, EffectiveApplicationStatus>;
  totalRows: number;
};


export async function pageApplicationsByEffectiveStatus({
  where,
  orderBy,
  statuses,
  statusSort,
  offset,
  pageSize,
}: {
  where: Prisma.AdoptionApplicationWhereInput;
  orderBy: Prisma.AdoptionApplicationOrderByWithRelationInput;
  statuses: readonly string[];
  statusSort: Prisma.SortOrder | undefined;
  offset: number;
  pageSize: number;
}): Promise<ApplicationPage> {
  
  
  
  const totalOrder = (
    first: Prisma.AdoptionApplicationOrderByWithRelationInput,
  ): Prisma.AdoptionApplicationOrderByWithRelationInput[] => [
    first,
    { id: "asc" },
  ];

  if (statuses.length === 0 && !statusSort) {
    const [rows, totalRows] = await Promise.all([
      prisma.adoptionApplication.findMany({
        where,
        orderBy: totalOrder(orderBy),
        skip: offset,
        take: pageSize,
        select: DERIVATION_APPLICATION_SELECT,
      }),
      prisma.adoptionApplication.count({ where }),
    ]);
    return {
      ids: rows.map((row) => row.id),
      statusById: await effectiveApplicationStatuses(rows),
      totalRows,
    };
  }

  const rows = await prisma.adoptionApplication.findMany({
    where,
    
    orderBy: totalOrder(statusSort ? { submittedAt: "desc" } : orderBy),
    select: DERIVATION_APPLICATION_SELECT,
  });
  const statusById = await effectiveApplicationStatuses(rows);
  const statusOf = (id: string) => statusById.get(id)!;

  let ids = rows.map((row) => row.id);
  if (statuses.length > 0) {
    ids = ids.filter((id) => statuses.includes(statusOf(id)));
  }
  if (statusSort) {
    const direction = statusSort === "asc" ? 1 : -1;
    ids.sort(
      (a, b) =>
        direction * (STATUS_SORT_RANK[statusOf(a)] - STATUS_SORT_RANK[statusOf(b)]),
    );
  }

  return {
    ids: ids.slice(offset, offset + pageSize),
    statusById,
    totalRows: ids.length,
  };
}



export function inPageOrder<Row extends { id: string }>(
  rows: readonly Row[],
  page: ApplicationPage,
): (Omit<Row, "status"> & { status: EffectiveApplicationStatus })[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return page.ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ ...row, status: page.statusById.get(id)! }] : [];
  });
}
