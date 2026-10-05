
export const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};





export function getRandomDate(yearsBack = 3, minYearsBack = 0): Date {
  const now = new Date();
  const start = new Date(
    now.getFullYear() - yearsBack,
    now.getMonth(),
    now.getDate(),
  );
  const end =
    minYearsBack === 0
      ? now
      : new Date(
          now.getFullYear() - minYearsBack,
          now.getMonth(),
          now.getDate(),
        );
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}


export function getRandomDateWithinLastDays(
  maxDaysAgo: number,
  minDaysAgo = 1,
): Date {
  const now = new Date();
  const daysAgo =
    Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysAgo,
    ),
  );
  return date;
}


export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export type SeededStay = { intakeDate: Date; outcomeDate: Date | null };








export function generateOrderedTimeline(opts: {
  stayCount: number;
  endsOpen: boolean;
  windowDays?: number;
  minStayDays?: number;
  maxStayDays?: number;
}): SeededStay[] {
  const {
    stayCount,
    endsOpen,
    windowDays = 90,
    minStayDays = 2,
    maxStayDays = 60,
  } = opts;

  const now = new Date();
  const windowStart = addDays(now, -windowDays);
  const stays: SeededStay[] = [];

  
  
  let cursor = now;

  for (let i = stayCount - 1; i >= 0; i--) {
    const isLast = i === stayCount - 1;
    const stayLength = randomInt(minStayDays, maxStayDays);

    if (isLast && endsOpen) {
      const intakeDate = addDays(cursor, -stayLength);
      stays.unshift({ intakeDate, outcomeDate: null });
      cursor = intakeDate;
      continue;
    }

    
    
    
    
    
    
    
    const rangeStart =
      cursor > windowStart ? windowStart : addDays(cursor, -(minStayDays + maxStayDays));
    const daysUntilCursor = Math.max(
      1,
      Math.round((cursor.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const outcomeDaysBeforeCursor = randomInt(1, daysUntilCursor);
    const outcomeDate = addDays(cursor, -outcomeDaysBeforeCursor);

    let intakeDate = addDays(outcomeDate, -stayLength);
    if (intakeDate < windowStart) {
      intakeDate = new Date(windowStart);
    }
    
    
    
    
    
    if (intakeDate >= outcomeDate) {
      intakeDate = addDays(outcomeDate, -1);
    }

    stays.unshift({ intakeDate, outcomeDate });
    
    
    cursor = addDays(intakeDate, -randomInt(1, 5));
  }

  return stays;
}
