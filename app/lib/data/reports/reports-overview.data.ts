import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import type { IntakeType, OutcomeType } from "@/prisma/generated/enums";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";
import { resolveReportRange } from "@/app/lib/utils/report-date-utils";
import { computeStays } from "@/app/lib/utils/stay-utils";
import {
  _fetchAnimalStayEvents,
  isLiveOutcome,
  parseSpeciesIds,
  speciesWhere,
} from "./report-shared.data";


const LONG_STAY_DAY_THRESHOLD = 90;


function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}





export type OutcomeSummary = {
  total: number;
  liveCount: number;
  liveReleaseRate: number; 
  topTypes: { type: OutcomeType; count: number }[]; 
};

const _fetchOutcomeSummary = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<OutcomeSummary> => {
  try {
    const range = resolveReportRange(from, to, await getShelterToday());
    const speciesIds = parseSpeciesIds(species);

    const grouped = await prisma.outcome.groupBy({
      by: ["type"],
      where: {
        outcomeDate: { gte: range.fromLabel, lte: range.toLabel },
        
        reversedAt: null,
        ...speciesWhere(speciesIds),
      },
      _count: { id: true },
    });

    const counts = grouped.map((g) => ({ type: g.type, count: g._count.id }));
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const liveCount = counts
      .filter((c) => isLiveOutcome(c.type))
      .reduce((sum, c) => sum + c.count, 0);
    const liveReleaseRate = total === 0 ? 0 : liveCount / total;
    const topTypes = [...counts]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { total, liveCount, liveReleaseRate, topTypes };
  } catch (error) {
    console.error("Error fetching outcome summary.", error);
    throw new Error("Error fetching outcome summary.");
  }
};





export type IntakeSummary = {
  total: number;
  topTypes: { type: IntakeType; count: number }[]; 
};

const _fetchIntakeSummary = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<IntakeSummary> => {
  try {
    const range = resolveReportRange(from, to, await getShelterToday());
    const speciesIds = parseSpeciesIds(species);

    const grouped = await prisma.intake.groupBy({
      by: ["type"],
      where: {
        intakeDate: { gte: range.fromLabel, lte: range.toLabel },
        ...speciesWhere(speciesIds),
      },
      _count: { id: true },
    });

    const counts = grouped.map((g) => ({ type: g.type, count: g._count.id }));
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const topTypes = [...counts]
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    return { total, topTypes };
  } catch (error) {
    console.error("Error fetching intake summary.", error);
    throw new Error("Error fetching intake summary.");
  }
};





export type BalanceSummary = {
  intakes: number;
  outcomes: number;
  net: number; 
};

const _fetchBalanceSummary = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<BalanceSummary> => {
  try {
    const range = resolveReportRange(from, to, await getShelterToday());
    const speciesIds = parseSpeciesIds(species);
    const filter = speciesWhere(speciesIds);

    const [intakes, outcomes] = await Promise.all([
      prisma.intake.count({
        where: { intakeDate: { gte: range.fromLabel, lte: range.toLabel }, ...filter },
      }),
      prisma.outcome.count({
        where: {
          outcomeDate: { gte: range.fromLabel, lte: range.toLabel },
          reversedAt: null,
          ...filter,
        },
      }),
    ]);

    return { intakes, outcomes, net: intakes - outcomes };
  } catch (error) {
    console.error("Error fetching balance summary.", error);
    throw new Error("Error fetching balance summary.");
  }
};





export type LengthOfStaySummary = {
  medianDays: number | null; 
  inCareNow: number;
  over90: number; 
};

const _fetchLengthOfStaySummary = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<LengthOfStaySummary> => {
  try {
    const today = await getShelterToday();
    const range = resolveReportRange(from, to, today);
    const speciesIds = parseSpeciesIds(species);

    
    
    
    const animals = await _fetchAnimalStayEvents(speciesIds);

    const completedStayDays: number[] = [];
    let inCareNow = 0;
    let over90 = 0;

    for (const animal of animals) {
      const { stays, isInCare, currentStayDays } = computeStays(
        animal.events,
        today,
      );

      
      for (const stay of stays) {
        if (
          stay.outcomeDate &&
          stay.outcomeDate >= range.fromLabel &&
          stay.outcomeDate <= range.toLabel
        ) {
          completedStayDays.push(stay.days);
        }
      }

      if (isInCare) {
        inCareNow += 1;
        if ((currentStayDays ?? 0) > LONG_STAY_DAY_THRESHOLD) over90 += 1;
      }
    }

    return { medianDays: median(completedStayDays), inCareNow, over90 };
  } catch (error) {
    console.error("Error fetching length of stay summary.", error);
    throw new Error("Error fetching length of stay summary.");
  }
};

export const fetchOutcomeSummary = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchOutcomeSummary);

export const fetchIntakeSummary = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchIntakeSummary);

export const fetchBalanceSummary = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchBalanceSummary);

export const fetchLengthOfStaySummary = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchLengthOfStaySummary);
