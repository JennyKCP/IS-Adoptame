






import { shelterDaysBetweenKeys, type CalendarDay } from "./shelter-day";

export type StayEvent = { kind: "intake" | "outcome"; date: CalendarDay };

export type Stay = {
  intakeDate: CalendarDay;
  outcomeDate: CalendarDay | null; 
  days: number; 
  
};

export type StayComputation = {
  stays: Stay[]; 
  isInCare: boolean; 
  currentStayDays: number | null; 
  cumulativeDays: number; 
};


export function orderStayEvents<E extends StayEvent>(events: readonly E[]): E[] {
  const byDay = [...events]
    
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const ordered: E[] = [];
  let open = false;
  for (let start = 0; start < byDay.length; ) {
    let end = start;
    while (end < byDay.length && byDay[end].date === byDay[start].date) {
      end += 1;
    }

    const sameDay = byDay.slice(start, end);
    const intakes = sameDay.filter((event) => event.kind === "intake");
    const outcomes = sameDay.filter((event) => event.kind === "outcome");
    const inOrder: E[] = open
      ? [...outcomes, ...intakes]
      : [...intakes, ...outcomes];
    for (const event of inOrder) {
      ordered.push(event);
      
      
      open = event.kind === "intake";
    }
    start = end;
  }
  return ordered;
}


export type TimelineBreak<E extends StayEvent> =
  | { kind: "leading-outcome"; event: E }
  | { kind: "repeated-kind"; first: E; second: E };


export function findTimelineBreaks<E extends StayEvent & { ref?: unknown }>(
  events: readonly E[],
): TimelineBreak<E>[] {
  const ordered = orderStayEvents(events);
  const breaks: TimelineBreak<E>[] = [];
  if (ordered.length > 0 && ordered[0].kind === "outcome") {
    breaks.push({ kind: "leading-outcome", event: ordered[0] });
  }
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].kind === ordered[i - 1].kind) {
      breaks.push({
        kind: "repeated-kind",
        first: ordered[i - 1],
        second: ordered[i],
      });
    }
  }
  return breaks;
}


export type ListingMismatch<E extends StayEvent> =
  | {
      
      kind: "left-but-listed-here";
      lastEvent: E;
      lastDayEvents: E[];
    }
  | {
      
      kind: "here-but-archived";
      lastEvent: E;
      lastDayEvents: E[];
    }
  | {
      
      
      kind: "no-intake-on-record";
      lastEvent: null;
      lastDayEvents: [];
    };


export function findListingMismatch<E extends StayEvent & { ref?: unknown }>(
  events: readonly E[],
  archived: boolean,
): ListingMismatch<E> | null {
  const ordered = orderStayEvents(events);
  if (ordered.length === 0) {
    return archived
      ? null
      : { kind: "no-intake-on-record", lastEvent: null, lastDayEvents: [] };
  }

  const lastEvent = ordered[ordered.length - 1];
  const here = lastEvent.kind === "intake";
  if (here !== archived) return null;

  return {
    kind: here ? "here-but-archived" : "left-but-listed-here",
    lastEvent,
    lastDayEvents: ordered.filter((event) => event.date === lastEvent.date),
  };
}


export function computeStays(
  events: StayEvent[],
  asOf: CalendarDay,
): StayComputation {
  const sorted = orderStayEvents(events);

  const stays: Stay[] = [];
  let openIntake: StayEvent | null = null;

  for (const event of sorted) {
    if (event.kind === "intake") {
      if (openIntake === null) {
        openIntake = event;
      }
      
    } else {
      if (openIntake !== null) {
        stays.push({
          intakeDate: openIntake.date,
          outcomeDate: event.date,
          days: shelterDaysBetweenKeys(openIntake.date, event.date),
        });
        openIntake = null;
      }
      
    }
  }

  
  if (openIntake !== null) {
    stays.push({
      intakeDate: openIntake.date,
      outcomeDate: null,
      days: shelterDaysBetweenKeys(openIntake.date, asOf),
    });
  }

  const isInCare = stays.length > 0 && stays[stays.length - 1].outcomeDate === null;
  const currentStayDays = isInCare ? stays[stays.length - 1].days : null;
  const cumulativeDays = stays.reduce((sum, stay) => sum + stay.days, 0);

  return { stays, isInCare, currentStayDays, cumulativeDays };
}
