












import { ApplicationStatus, OutcomeType } from "@/prisma/generated/enums";


export const ApplicationConsequence = {
  ADOPTED: "ADOPTED",
  CLOSED: "CLOSED",
} as const;

export type ApplicationConsequence =
  (typeof ApplicationConsequence)[keyof typeof ApplicationConsequence];




export const EffectiveApplicationStatus = {
  ...ApplicationStatus,
  ...ApplicationConsequence,
} as const;

export type EffectiveApplicationStatus =
  | ApplicationStatus
  | ApplicationConsequence;



export type WithEffectiveStatus<Row extends { status: ApplicationStatus }> =
  Omit<Row, "status"> & { status: EffectiveApplicationStatus };

export const isReviewStatus = (
  status: EffectiveApplicationStatus,
): status is ApplicationStatus =>
  status !== ApplicationConsequence.ADOPTED &&
  status !== ApplicationConsequence.CLOSED;





const SETTLED_REVIEW_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
]);

export type DerivationApplication = {
  id: string;
  reviewStatus: ApplicationStatus;
  submittedAt: Date;
};




export type DerivationOutcome = {
  createdAt: Date;
  type: OutcomeType;
  adoptionApplicationId: string | null;
  reversed: boolean;
};




export const toDerivationOutcome = <Row extends { reversedAt: Date | null }>({
  reversedAt,
  ...row
}: Row) => ({ ...row, reversed: reversedAt !== null });


export function deriveApplicationStatus(
  application: DerivationApplication,
  outcomes: readonly DerivationOutcome[],
): EffectiveApplicationStatus {
  return (
    deriveApplicationConsequence(application, outcomes)?.status ??
    application.reviewStatus
  );
}


export function deriveApplicationStatuses(
  applications: readonly {
    id: string;
    animalId: string;
    status: ApplicationStatus;
    submittedAt: Date;
  }[],
  outcomes: readonly (DerivationOutcome & { animalId: string })[],
): Map<string, EffectiveApplicationStatus> {
  const outcomesByAnimal = new Map<string, DerivationOutcome[]>();
  for (const outcome of outcomes) {
    const list = outcomesByAnimal.get(outcome.animalId) ?? [];
    list.push(outcome);
    outcomesByAnimal.set(outcome.animalId, list);
  }

  return new Map(
    applications.map((application) => [
      application.id,
      deriveApplicationStatus(
        {
          id: application.id,
          reviewStatus: application.status,
          submittedAt: application.submittedAt,
        },
        outcomesByAnimal.get(application.animalId) ?? [],
      ),
    ]),
  );
}


export function deriveApplicationConsequence<
  Outcome extends DerivationOutcome,
>(
  application: DerivationApplication,
  outcomes: readonly Outcome[],
): { status: ApplicationConsequence; outcome: Outcome } | null {
  const live = outcomes.filter((outcome) => !outcome.reversed);

  const adoption = live.find(
    (outcome) =>
      outcome.type === OutcomeType.ADOPTION &&
      outcome.adoptionApplicationId === application.id,
  );
  if (adoption) {
    return { status: ApplicationConsequence.ADOPTED, outcome: adoption };
  }

  if (SETTLED_REVIEW_STATUSES.has(application.reviewStatus)) {
    return null;
  }

  const closedBy = live
    .filter(
      (outcome) =>
        outcome.createdAt.getTime() >= application.submittedAt.getTime(),
    )
    .reduce<Outcome | null>(
      (first, outcome) =>
        first === null || outcome.createdAt < first.createdAt ? outcome : first,
      null,
    );
  return closedBy && { status: ApplicationConsequence.CLOSED, outcome: closedBy };
}
