










import { format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const MS_PER_DAY = 24 * 60 * 60 * 1000;


export type CalendarDay = string & { readonly __brand: unique symbol };

const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;


export const parseCalendarDay = (value: unknown): CalendarDay | null => {
  if (typeof value !== "string" || !DAY_SHAPE.test(value)) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd") === value
    ? (value as CalendarDay)
    : null;
};


export const calendarDay = (value: string): CalendarDay => {
  const day = parseCalendarDay(value);
  if (day === null) {
    throw new Error(`Not a calendar day: ${JSON.stringify(value)}`);
  }
  return day;
};


export const shelterDayKey = (date: Date, timezone: string): CalendarDay =>
  formatInTimeZone(date, timezone, "yyyy-MM-dd") as CalendarDay;


export const shelterToday = (
  timezone: string,
  now: Date = new Date(),
): CalendarDay =>
  shelterDayKey(now, timezone);


export const startOfShelterDay = (day: CalendarDay, timezone: string): Date =>
  fromZonedTime(`${day} 00:00:00`, timezone);


export const formatShelterDay = (day: CalendarDay): string =>
  format(parseISO(day), "MMM d, yyyy");


export const formatShelterDayOrNA = (
  value: string | null | undefined,
): string => {
  if (value == null) return "N/A";
  const day = parseCalendarDay(value);
  return day === null ? "Invalid Date" : formatShelterDay(day);
};







const dayNumber = (day: CalendarDay): number => {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, date);
  return utc.getTime() / MS_PER_DAY;
};


export const shiftDayKey = (day: CalendarDay, days: number): CalendarDay =>
  new Date((dayNumber(day) + days) * MS_PER_DAY)
    .toISOString()
    .slice(0, 10) as CalendarDay;


export const countByShelterDay = (
  days: Iterable<CalendarDay>,
): Map<CalendarDay, number> => {
  const counts = new Map<CalendarDay, number>();
  for (const day of days) {
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
};


export const shelterDaysBetweenKeys = (
  since: CalendarDay,
  now: CalendarDay,
): number => Math.max(0, dayNumber(now) - dayNumber(since));


export const shelterDaysBetween = (
  since: Date,
  now: Date,
  timezone: string,
): number =>
  shelterDaysBetweenKeys(
    shelterDayKey(since, timezone),
    shelterDayKey(now, timezone),
  );
