import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import { OutcomeType } from "@/prisma/generated/enums";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";
import { resolveReportRange } from "@/app/lib/utils/report-date-utils";
import {
  isLiveOutcome,
  LIVE_OUTCOME_TYPES,
  parseSpeciesIds,
  speciesWhere,
} from "./report-shared.data";





const OUTCOME_TYPE_ORDER: readonly OutcomeType[] = [
  ...LIVE_OUTCOME_TYPES, 
  OutcomeType.EUTHANIZED,
  OutcomeType.DECEASED,
  OutcomeType.OTHER,
];

export type OutcomeReportRow = {
  type: OutcomeType;
  count: number;
  isLive: boolean;
  percentOfTotal: number; 
  percentOfLive: number | null; 
};

export type OutcomeReport = {
  total: number;
  liveCount: number;
  nonLiveCount: number;
  
  liveReleaseRate: number | null;
  
  
  rows: OutcomeReportRow[];
  fromLabel: string;
  toLabel: string;
};


const _fetchOutcomeReport = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<OutcomeReport> => {
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

    const countByType = new Map<OutcomeType, number>(
      grouped.map((g) => [g.type, g._count.id]),
    );

    const total = grouped.reduce((sum, g) => sum + g._count.id, 0);
    const liveCount = grouped
      .filter((g) => isLiveOutcome(g.type))
      .reduce((sum, g) => sum + g._count.id, 0);
    const nonLiveCount = total - liveCount;

    const rows: OutcomeReportRow[] = OUTCOME_TYPE_ORDER.filter((type) =>
      countByType.has(type),
    ).map((type) => {
      const count = countByType.get(type) ?? 0;
      const live = isLiveOutcome(type);
      return {
        type,
        count,
        isLive: live,
        percentOfTotal: total === 0 ? 0 : count / total,
        percentOfLive: live && liveCount > 0 ? count / liveCount : live ? 0 : null,
      };
    });

    return {
      total,
      liveCount,
      nonLiveCount,
      liveReleaseRate: total === 0 ? null : liveCount / total,
      rows,
      fromLabel: range.fromLabel,
      toLabel: range.toLabel,
    };
  } catch (error) {
    console.error("Error fetching outcome report.", error);
    throw new Error("Error fetching outcome report.");
  }
};

export const fetchOutcomeReport = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchOutcomeReport);
