



import { computeStays, type StayEvent } from "./stay-utils";
import type { CalendarDay } from "./shelter-day";
import type { ReportRange } from "./report-date-utils";



const LONG_STAY_DAY_THRESHOLD = 90;


const WORKLIST_LIMIT = 20;


function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}





type BucketDef = { label: string; test: (days: number) => boolean };
const HISTOGRAM_BUCKETS: readonly BucketDef[] = [
  { label: "0–7", test: (d) => d <= 7 },
  { label: "8–30", test: (d) => d > 7 && d <= 30 },
  { label: "31–90", test: (d) => d > 30 && d <= 90 },
  { label: "90+", test: (d) => d > 90 },
];

export type LosHistogramBucket = {
  label: string; 
  count: number;
};

export type LongestStayRow = {
  animalId: string;
  name: string;
  speciesName: string;
  currentStayDays: number;
  cumulativeDays: number;
  
  
  hasPriorStays: boolean;
  intakeDate: CalendarDay; 
};

export type LengthOfStayStats = {
  
  medianDays: number | null; 
  longestCompletedDays: number | null; 
  completedCount: number;
  histogram: LosHistogramBucket[];
  inCareNow: number; 
  over90: number; 
  worklist: LongestStayRow[]; 
};


export type AnimalStayHistory = {
  id: string;
  name: string;
  speciesName: string;
  events: StayEvent[];
};


export function summarizeLengthOfStay(
  animals: readonly AnimalStayHistory[],
  range: ReportRange,
  today: CalendarDay,
): LengthOfStayStats {
  const completedStayDays: number[] = [];
  const inCareRows: LongestStayRow[] = [];

  for (const animal of animals) {
    const { stays, isInCare, currentStayDays, cumulativeDays } = computeStays(
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
      const openStay = stays[stays.length - 1];
      inCareRows.push({
        animalId: animal.id,
        name: animal.name,
        speciesName: animal.speciesName,
        currentStayDays: currentStayDays ?? 0,
        cumulativeDays,
        hasPriorStays: cumulativeDays !== (currentStayDays ?? 0),
        intakeDate: openStay.intakeDate,
      });
    }
  }

  const histogram: LosHistogramBucket[] = HISTOGRAM_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: completedStayDays.filter((days) => bucket.test(days)).length,
  }));

  
  
  inCareRows.sort(
    (a, b) =>
      b.currentStayDays - a.currentStayDays ||
      b.cumulativeDays - a.cumulativeDays ||
      a.name.localeCompare(b.name),
  );
  const over90 = inCareRows.filter(
    (row) => row.currentStayDays > LONG_STAY_DAY_THRESHOLD,
  ).length;

  return {
    medianDays: median(completedStayDays),
    longestCompletedDays:
      completedStayDays.length === 0 ? null : Math.max(...completedStayDays),
    completedCount: completedStayDays.length,
    histogram,
    inCareNow: inCareRows.length,
    over90,
    worklist: inCareRows.slice(0, WORKLIST_LIMIT),
  };
}
