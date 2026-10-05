import type { AnimalListingStatus } from "@/prisma/generated/enums";
import {
  blockerAction,
  describeBlocker,
  earliestSince,
  orderBlockers,
  type AnimalReadiness,
  type ReadinessBlockerKind,
  type ReadinessViewerCan,
} from "@/app/lib/readiness/board";
import {
  shelterDayKey,
  shelterDaysBetween,
} from "@/app/lib/utils/shelter-day";


export type OutstandingItemView = {
  kind: ReadinessBlockerKind;
  
  description: string;
  
  since: string | null;
  
  daysOutstanding: number | null;
  
  nextStep: string;
};

type ReadinessIdentity = {
  animalId: string;
  name: string;
  listingStatus: AnimalListingStatus;
};


export type AnimalReadinessView = ReadinessIdentity &
  (
    | { status: "ARCHIVED" }
    | { status: "READY" }
    | {
        status: "NOT_READY";
        
        daysOutstanding: number | null;
        
        outstanding: OutstandingItemView[];
      }
  );


export type ReadinessLine =
  | { status: "ARCHIVED" }
  | { status: "READY" }
  | {
      status: "NOT_READY";
      outstandingCount: number;
      daysOutstanding: number | null;
      
      kinds: ReadinessBlockerKind[];
    };


export function toAnimalReadinessView(
  readiness: AnimalReadiness,
  can: ReadinessViewerCan,
  now: Date,
  timezone: string,
): AnimalReadinessView {
  const { animal, blockers } = readiness;
  const identity: ReadinessIdentity = {
    animalId: animal.id,
    name: animal.name,
    listingStatus: animal.listingStatus,
  };

  if (animal.listingStatus === "ARCHIVED") {
    return { ...identity, status: "ARCHIVED" };
  }
  if (blockers.length === 0) {
    return { ...identity, status: "READY" };
  }

  const since = earliestSince(blockers);
  return {
    ...identity,
    status: "NOT_READY",
    daysOutstanding: since ? shelterDaysBetween(since, now, timezone) : null,
    outstanding: orderBlockers(blockers).map((blocker) => ({
      kind: blocker.kind,
      description: describeBlocker(blocker, timezone),
      since: blocker.since ? shelterDayKey(blocker.since, timezone) : null,
      daysOutstanding: blocker.since
        ? shelterDaysBetween(blocker.since, now, timezone)
        : null,
      nextStep: blockerAction(blocker, animal.id, can).label,
    })),
  };
}

export function toReadinessLine(
  readiness: AnimalReadiness,
  now: Date,
  timezone: string,
): ReadinessLine {
  const { animal, blockers } = readiness;
  if (animal.listingStatus === "ARCHIVED") return { status: "ARCHIVED" };
  if (blockers.length === 0) return { status: "READY" };

  const since = earliestSince(blockers);
  return {
    status: "NOT_READY",
    outstandingCount: blockers.length,
    daysOutstanding: since ? shelterDaysBetween(since, now, timezone) : null,
    kinds: [...new Set(orderBlockers(blockers).map((b) => b.kind))],
  };
}
