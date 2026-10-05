import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { format, parseISO } from "date-fns";

import prisma from "@/app/lib/prisma";
import { IntakeType } from "@/prisma/generated/enums";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";
import { resolveReportRange } from "@/app/lib/utils/report-date-utils";
import { calendarDay } from "@/app/lib/utils/shelter-day";
import { parseSpeciesIds, speciesWhere } from "./report-shared.data";


const TOP_PARTNER_LIMIT = 10;

export type IntakeReportRow = {
  type: IntakeType;
  count: number;
  percentOfTotal: number; 
};



export type MonthlyIntakePoint = {
  month: string; 
  label: string; 
  count: number;
};

export type IntakePartnerRow = {
  partnerId: string;
  name: string;
  count: number;
};

export type IntakeReport = {
  total: number;
  transfersIn: number;
  
  largestSource: { type: IntakeType; count: number } | null;
  
  byType: IntakeReportRow[];
  
  monthlySeries: MonthlyIntakePoint[];
  
  
  topPartners: IntakePartnerRow[];
  fromLabel: string;
  toLabel: string;
};


function monthKeysInRange(fromLabel: string, toLabel: string): string[] {
  let [year, month] = fromLabel.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = toLabel.slice(0, 7).split("-").map(Number);

  const keys: string[] = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}


function monthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01`), "MMM yyyy");
}


const _fetchIntakeReport = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<IntakeReport> => {
  try {
    const range = resolveReportRange(from, to, await getShelterToday());
    const speciesIds = parseSpeciesIds(species);
    const where = {
      intakeDate: { gte: range.fromLabel, lte: range.toLabel },
      ...speciesWhere(speciesIds),
    };

    
    
    const [grouped, intakeDates, partnerGroups] = await Promise.all([
      prisma.intake.groupBy({
        by: ["type"],
        where,
        _count: { id: true },
      }),
      prisma.intake.findMany({
        where,
        select: { intakeDate: true },
      }),
      prisma.intake.groupBy({
        by: ["sourcePartnerId"],
        where: {
          ...where,
          type: IntakeType.TRANSFER_IN,
          sourcePartnerId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const total = grouped.reduce((sum, g) => sum + g._count.id, 0);
    const transfersIn =
      grouped.find((g) => g.type === IntakeType.TRANSFER_IN)?._count.id ?? 0;

    const byType: IntakeReportRow[] = grouped
      .map((g) => ({
        type: g.type,
        count: g._count.id,
        percentOfTotal: total === 0 ? 0 : g._count.id / total,
      }))
      .sort((a, b) => b.count - a.count);

    const largestSource =
      byType.length > 0
        ? { type: byType[0].type, count: byType[0].count }
        : null;

    
    
    
    const bucket = new Map<string, number>();
    for (const { intakeDate } of intakeDates) {
      const key = calendarDay(intakeDate).slice(0, 7);
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    }
    const monthlySeries: MonthlyIntakePoint[] = monthKeysInRange(
      range.fromLabel,
      range.toLabel,
    ).map((month) => ({
      month,
      label: monthLabel(month),
      count: bucket.get(month) ?? 0,
    }));

    
    const sortedPartners = partnerGroups
      .filter(
        (g): g is typeof g & { sourcePartnerId: string } =>
          g.sourcePartnerId !== null,
      )
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, TOP_PARTNER_LIMIT);

    const partnerIds = sortedPartners.map((g) => g.sourcePartnerId);
    const partners =
      partnerIds.length > 0
        ? await prisma.partner.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(partners.map((p) => [p.id, p.name]));

    const topPartners: IntakePartnerRow[] = sortedPartners.map((g) => ({
      partnerId: g.sourcePartnerId,
      name: nameById.get(g.sourcePartnerId) ?? "Unknown partner",
      count: g._count.id,
    }));

    return {
      total,
      transfersIn,
      largestSource,
      byType,
      monthlySeries,
      topPartners,
      fromLabel: range.fromLabel,
      toLabel: range.toLabel,
    };
  } catch (error) {
    console.error("Error fetching intake report.", error);
    throw new Error("Error fetching intake report.");
  }
};

export const fetchIntakeReport = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchIntakeReport);
