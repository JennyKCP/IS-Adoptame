import {
  differenceInYears,
  differenceInMonths,
  format,
  differenceInWeeks,
  differenceInDays,
  addYears,
  formatDistanceStrict,
  formatDistanceToNowStrict,
  parseISO,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TaskStatus } from "@/prisma/generated/enums";
import { parseCalendarDay, type CalendarDay } from "./shelter-day";

interface calculateAgeStringProps {
  
  birthDate: CalendarDay;
  
  simple?: boolean;
}


export const calculateAgeString = ({ birthDate, simple = false }: calculateAgeStringProps): string => {
  
  const date = parseISO(birthDate);
  return simple ? calculateSimpleAge(date) : calculateDetailedAge(date);
}

const calculateSimpleAge = (birthDate: Date): string => {
  const now = new Date();
  
  
  const pluralizeUnit = (count: number, unit: string): string => `${count} ${unit}${count === 1 ? "" : "s"}`;

  if (birthDate > now) {
    
    return "Birth date is in the future";
  }
  
  
  const years = differenceInYears(now, birthDate);
  if (years > 0) {
    return pluralizeUnit(years, "year");
  }

  const months = differenceInMonths(now, birthDate); 
  if (months > 0) {
    return pluralizeUnit(months, "month");
  }

  const weeks = differenceInWeeks(now, birthDate); 
  if (weeks > 0) {
    return pluralizeUnit(weeks, "week");
  }

  const days = differenceInDays(now, birthDate); 
  return days === 0 ? "Newborn" : pluralizeUnit(days, "day");
};

const calculateDetailedAge = (birthDate: Date): string => {
  const now = new Date();
  
  const pluralizeUnit = (count: number, unit: string): string => `${count} ${unit}${count === 1 ? "" : "s"}`;

  
  if (birthDate > now) {
    
    return "Birth date is in the future";
  }

  const years = differenceInYears(now, birthDate);
  const dateAfterYears = addYears(birthDate, years);
  const months = differenceInMonths(now, dateAfterYears); 

  if (years > 0) {
    const yearStr = pluralizeUnit(years, "year");
    const monthStr = months > 0 ? `, ${pluralizeUnit(months, "month")}` : "";
    return `${yearStr}${monthStr}`;
    }

    
    
    if (months > 0) {
      return pluralizeUnit(months, "month");
    }

    const weeks = differenceInWeeks(now, birthDate);
    if (weeks > 0) {
      return pluralizeUnit(weeks, "week");
    }

    const days = differenceInDays(now, birthDate);
    return days === 0 ? "Newborn" : pluralizeUnit(days, "day");
};


export function formatDateToLongString(date: Date): string { 
  return format(date, 'MMMM d, yyyy');
}


export const formatDateOrNA = (
  dateInput: string | Date | undefined | null,
  pattern = "MMM d, yyyy",
): string => {
  if (dateInput === null || dateInput === undefined) {
    return "N/A";
  }

  try {
    return format(dateInput, pattern);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};


export const formatUtcDateOrNA = (
  dateInput: string | Date | undefined | null,
  pattern = "MMM d, yyyy",
): string => {
  if (dateInput === null || dateInput === undefined) return "N/A";
  try {
    return formatInTimeZone(dateInput, "UTC", pattern);
  } catch {
    return "Invalid Date";
  }
};


export const formatTimeAgo = (dateInput: string | Date | undefined | null): string => {
  if (dateInput === null || dateInput === undefined) {
    return "N/A";
  }

  try {
    const date = new Date(dateInput);

    
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting time ago:", error);
    return "Invalid Date";
  }
};


export const formatDueDay = (
  day: string | null | undefined,
  status: TaskStatus,
  today: CalendarDay,
): string => {
  if (day === null || day === undefined) {
    return "N/A";
  }

  const due = parseCalendarDay(day);
  if (due === null) {
    return "Invalid Date";
  }
  if (due === today) {
    return "Today";
  }

  
  
  const distance = formatDistanceStrict(parseISO(due), parseISO(today));

  
  
  const isActive =
    status === TaskStatus.TODO || status === TaskStatus.IN_PROGRESS;
  if (due < today) {
    return isActive ? `Overdue by ${distance}` : `${distance} ago`;
  }
  return `in ${distance}`;
};


export const isFosterPlacementOverdue = (
  expectedEndDate: string | null | undefined,
  today: CalendarDay,
): boolean => !!expectedEndDate && expectedEndDate < today;
