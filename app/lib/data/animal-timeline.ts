



import {
  computeStays,
  findTimelineBreaks,
  orderStayEvents,
  type Stay,
  type StayEvent,
} from "@/app/lib/utils/stay-utils";
import {
  formatShelterDay,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";


export type TimelineChange =
  | { kind: "addIntake"; day: CalendarDay }
  | { kind: "addOutcome"; day: CalendarDay }
  | { kind: "moveIntake"; intakeId: string; day: CalendarDay }
  | { kind: "moveOutcome"; outcomeId: string; day: CalendarDay };


export type TimelineEvent = StayEvent & { ref: string };



export const NEW_EVENT_REF = "new";

export type AppliedTimelineChange = {
  before: TimelineEvent[];
  after: TimelineEvent[];
  
  subject: TimelineEvent;
};


export function applyTimelineChange(
  events: readonly TimelineEvent[],
  change: TimelineChange,
): AppliedTimelineChange {
  switch (change.kind) {
    case "addIntake":
    case "addOutcome": {
      const subject: TimelineEvent = {
        kind: change.kind === "addIntake" ? "intake" : "outcome",
        date: change.day,
        ref: NEW_EVENT_REF,
      };
      return { before: [...events], after: [...events, subject], subject };
    }
    case "moveIntake":
    case "moveOutcome": {
      const kind = change.kind === "moveIntake" ? "intake" : "outcome";
      const ref =
        change.kind === "moveIntake" ? change.intakeId : change.outcomeId;
      const index = events.findIndex(
        (event) => event.kind === kind && event.ref === ref,
      );
      if (index === -1) {
        throw new Error(`No ${kind} ${ref} on this animal's timeline.`);
      }
      const subject: TimelineEvent = { kind, date: change.day, ref };
      const after = [...events];
      after[index] = subject;
      return { before: [...events], after, subject };
    }
  }
}









const findCrossedNeighbour = ({
  before,
  after,
  subject,
}: AppliedTimelineChange): {
  neighbour: TimelineEvent;
  direction: "before" | "after";
} | null => {
  const isSubject = (event: TimelineEvent) =>
    event.kind === subject.kind && event.ref === subject.ref;

  const orderedAfter = orderStayEvents(after);
  const others = orderedAfter.filter((event) => !isSubject(event));
  const to = orderedAfter.findIndex(isSubject);
  const fromIndex = orderStayEvents(before).findIndex(isSubject);
  const from = fromIndex === -1 ? others.length : fromIndex;

  const crosses = (event: TimelineEvent) => event.kind !== subject.kind;
  if (to > from) {
    const neighbour = others.slice(from, to).find(crosses);
    return neighbour ? { neighbour, direction: "after" } : null;
  }
  if (to < from) {
    const neighbour = others.slice(to, from).findLast(crosses);
    return neighbour ? { neighbour, direction: "before" } : null;
  }
  return null;
};




const describeNeighbour = (
  subject: TimelineEvent,
  direction: "before" | "after",
): string => {
  if (subject.kind === "intake") {
    return direction === "after"
      ? "this stay's outcome"
      : "the previous outcome";
  }
  return direction === "after" ? "the next intake" : "this stay's intake";
};


export function refuseFutureDay(
  kind: TimelineEvent["kind"],
  day: CalendarDay,
  today: CalendarDay,
): string | null {
  return day > today ? `The ${kind} date can't be in the future.` : null;
}


export function evaluateTimelineChange(
  events: readonly TimelineEvent[],
  change: TimelineChange,
  today: CalendarDay,
): string | null {
  const applied = applyTimelineChange(events, change);
  const noun = applied.subject.kind;

  const future = refuseFutureDay(noun, change.day, today);
  if (future) {
    return future;
  }

  if (
    findTimelineBreaks(applied.after).length <=
    findTimelineBreaks(applied.before).length
  ) {
    return null;
  }

  
  const crossed = findCrossedNeighbour(applied);
  if (crossed && crossed.neighbour.date !== change.day) {
    return `The ${noun} date can't be ${crossed.direction} ${describeNeighbour(
      applied.subject,
      crossed.direction,
    )} on ${formatShelterDay(crossed.neighbour.date)}.`;
  }

  
  
  
  
  const { subject } = applied;
  const sameDayKinds = new Set(
    applied.after
      .filter((event) => event !== subject && event.date === change.day)
      .map((event) => event.kind),
  );
  if (sameDayKinds.size > 0) {
    const held =
      sameDayKinds.size === 2
        ? "an intake and an outcome"
        : sameDayKinds.has("intake")
          ? "an intake"
          : "an outcome";
    return `The ${noun} date can't be ${formatShelterDay(
      change.day,
    )}: this animal already has ${held} that day, and a day can hold only one of each.`;
  }

  return `The ${noun} date would put this animal's intakes and outcomes out of order.`;
}


export type PlacementSpan = {
  ref: string;
  startDate: CalendarDay;
  endDate: CalendarDay | null;
  
  outcomeId: string | null;
  fosterName: string;
};




const liesInsideAStay = (
  placement: Pick<PlacementSpan, "startDate" | "endDate">,
  stays: readonly Stay[],
): boolean =>
  stays.some((stay) => {
    if (stay.intakeDate > placement.startDate) return false;
    if (stay.outcomeDate === null) return true;
    return (
      placement.endDate !== null &&
      placement.startDate <= stay.outcomeDate &&
      placement.endDate <= stay.outcomeDate
    );
  });





const movesWithChange = (
  placement: PlacementSpan,
  change: TimelineChange,
): boolean =>
  (change.kind === "addOutcome" && placement.endDate === null) ||
  (change.kind === "moveOutcome" && placement.outcomeId === change.outcomeId);


export function evaluatePlacementBounds(
  events: readonly TimelineEvent[],
  placements: readonly PlacementSpan[],
  change: TimelineChange,
): string | null {
  const { before, after, subject } = applyTimelineChange(events, change);
  
  const staysBefore = computeStays(before, change.day).stays;
  const staysAfter = computeStays(after, change.day).stays;

  const crossed = placements.flatMap((placement) => {
    if (!liesInsideAStay(placement, staysBefore)) return [];
    const moves = movesWithChange(placement, change);
    const endDate = moves ? change.day : placement.endDate;
    if (liesInsideAStay({ ...placement, endDate }, staysAfter)) return [];
    
    
    
    return moves || endDate === null || endDate < placement.startDate
      ? [{ placement, bound: placement.startDate, verb: "began" }]
      : [{ placement, bound: endDate, verb: "ended" }];
  });
  if (crossed.length === 0) return null;

  
  
  
  if (subject.kind === "intake") {
    const first = crossed.reduce((a, b) =>
      b.placement.startDate < a.placement.startDate ? b : a,
    );
    return `The intake date can't be after the foster placement with ${
      first.placement.fosterName
    } began on ${formatShelterDay(first.placement.startDate)}.`;
  }
  const last = crossed.reduce((a, b) => (b.bound > a.bound ? b : a));
  return `The outcome date can't be before the foster placement with ${
    last.placement.fosterName
  } ${last.verb} on ${formatShelterDay(last.bound)}.`;
}
