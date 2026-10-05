






import { parseISO, format } from "date-fns";
import {
  parseCalendarDay,
  shiftDayKey,
  shelterDaysBetweenKeys,
  type CalendarDay,
} from "./shelter-day";


const MAX_RANGE_DAYS = 731;

export type ReportRange = {
  
  fromLabel: CalendarDay;
  
  toLabel: CalendarDay;
};


function startOfYearDay(today: CalendarDay): CalendarDay {
  return `${today.slice(0, 4)}-01-01` as CalendarDay;
}


export function resolveReportRange(
  from: string | undefined,
  to: string | undefined,
  today: CalendarDay,
): ReportRange {
  let fromDay = parseCalendarDay(from) ?? startOfYearDay(today);
  let toDay = parseCalendarDay(to) ?? today;

  
  if (fromDay > toDay) {
    [fromDay, toDay] = [toDay, fromDay];
  }

  
  if (shelterDaysBetweenKeys(fromDay, toDay) > MAX_RANGE_DAYS) {
    fromDay = shiftDayKey(toDay, -MAX_RANGE_DAYS);
  }

  return { fromLabel: fromDay, toLabel: toDay };
}


export function formatRangeLabel(range: ReportRange): string {
  const fromDate = parseISO(range.fromLabel);
  const toDate = parseISO(range.toLabel);
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();

  const fromStr = format(fromDate, sameYear ? "MMM d" : "MMM d, yyyy");
  const toStr = format(toDate, "MMM d, yyyy");
  return `${fromStr} – ${toStr}`;
}
