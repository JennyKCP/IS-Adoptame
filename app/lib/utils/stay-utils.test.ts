import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDay } from "./shelter-day";
import {
  computeStays,
  findListingMismatch,
  findTimelineBreaks,
  orderStayEvents,
  type StayEvent,
} from "./stay-utils";



const day = calendarDay;
const intake = (d: string): StayEvent => ({ kind: "intake", date: day(d) });
const outcome = (d: string): StayEvent => ({ kind: "outcome", date: day(d) });

const SEP_10 = "2026-09-10";
const SEP_15 = "2026-09-15";
const SEP_20 = "2026-09-20";
const SEP_18 = day("2026-09-18");

test("a same-day intake and outcome close a stay of zero days", () => {
  const result = computeStays([outcome(SEP_10), intake(SEP_10)], SEP_18);
  assert.equal(result.isInCare, false);
  assert.equal(result.stays.length, 1);
  assert.deepEqual(result.stays[0], {
    intakeDate: SEP_10,
    outcomeDate: SEP_10,
    days: 0,
  });
  assert.equal(result.cumulativeDays, 0);
});

test("the order the same-day events arrive in does not change the result", () => {
  const a = computeStays([intake(SEP_10), outcome(SEP_10)], SEP_18);
  const b = computeStays([outcome(SEP_10), intake(SEP_10)], SEP_18);
  assert.deepEqual(a, b);
});

test("an outcome then a re-intake on one day still ends in care", () => {
  const result = computeStays(
    [intake(SEP_10), outcome(SEP_15), intake(SEP_15)],
    SEP_18,
  );
  assert.equal(result.isInCare, true);
  assert.deepEqual(result.stays, [
    { intakeDate: SEP_10, outcomeDate: SEP_15, days: 5 },
    { intakeDate: SEP_15, outcomeDate: null, days: 3 },
  ]);
  assert.equal(result.currentStayDays, 3);
  assert.equal(result.cumulativeDays, 8);
});

test("a same-day stay followed by a later stay reads as two stays", () => {
  const result = computeStays(
    [intake(SEP_10), outcome(SEP_10), intake(SEP_15)],
    SEP_18,
  );
  assert.equal(result.isInCare, true);
  assert.equal(result.stays.length, 2);
  assert.equal(result.stays[0].days, 0);
  assert.equal(result.stays[0].outcomeDate, SEP_10);
  assert.equal(result.currentStayDays, 3);
});

test("distinct-day events keep their chronological order", () => {
  const result = computeStays(
    [outcome(SEP_15), intake(SEP_10), intake(SEP_20)],
    day("2026-09-22"),
  );
  assert.equal(result.isInCare, true);
  assert.deepEqual(
    result.stays.map((stay) => stay.days),
    [5, 2],
  );
});

test("an orphan outcome with no earlier intake is ignored", () => {
  const result = computeStays([outcome(SEP_10), intake(SEP_15)], SEP_18);
  assert.equal(result.isInCare, true);
  assert.equal(result.stays.length, 1);
  assert.equal(result.stays[0].intakeDate, SEP_15);
});

test("a duplicate intake while in care keeps the original date", () => {
  const result = computeStays([intake(SEP_10), intake(SEP_15)], SEP_18);
  assert.equal(result.stays.length, 1);
  assert.equal(result.stays[0].intakeDate, SEP_10);
  assert.equal(result.currentStayDays, 8);
});

test("a stay across a DST change counts calendar days, not 24-hour blocks", () => {
  
  
  assert.equal(
    computeStays(
      [intake("2026-03-07"), outcome("2026-03-09")],
      day("2026-03-20"),
    ).stays[0].days,
    2,
  );
  assert.equal(
    computeStays(
      [intake("2026-10-31"), outcome("2026-11-02")],
      day("2026-11-20"),
    ).stays[0].days,
    2,
  );
});

test("an open stay is measured to `asOf`", () => {
  const result = computeStays([intake(SEP_10)], day("2026-09-11"));
  assert.equal(result.isInCare, true);
  assert.equal(result.currentStayDays, 1);
  assert.equal(
    computeStays([intake(SEP_10)], day(SEP_10)).currentStayDays,
    0,
  );
});

test("ordering puts a same-day intake first only while no stay is open", () => {
  const closed = orderStayEvents([outcome(SEP_10), intake(SEP_10)]);
  assert.deepEqual(closed.map((event) => event.kind), ["intake", "outcome"]);

  const open = orderStayEvents([
    intake("2026-09-01"),
    intake(SEP_10),
    outcome(SEP_10),
  ]);
  assert.deepEqual(open.map((event) => event.kind), [
    "intake",
    "outcome",
    "intake",
  ]);
});

test("a day holding two events of one kind keeps only the outer pair", () => {
  
  
  
  
  const result = computeStays(
    [
      intake("2026-09-01"),
      outcome(SEP_10),
      intake(SEP_10),
      outcome(SEP_10),
    ],
    SEP_18,
  );
  assert.equal(result.isInCare, true);
  assert.deepEqual(
    result.stays.map((stay) => stay.days),
    [9, 8],
  );
});

test("a well-formed timeline has no breaks", () => {
  assert.deepEqual(
    findTimelineBreaks([
      intake("2026-09-01"),
      outcome(SEP_10),
      intake(SEP_15),
      outcome(SEP_20),
      intake("2026-09-22"),
    ]),
    [],
  );
  assert.deepEqual(findTimelineBreaks([]), []);
});

test("an outcome before any intake is a leading break", () => {
  const orphan = { ...outcome(SEP_10), ref: "o1" };
  const breaks = findTimelineBreaks([intake(SEP_15), orphan]);
  assert.deepEqual(breaks, [{ kind: "leading-outcome", event: orphan }]);
});

test("two intakes in a row are a break, naming both", () => {
  const first = { ...intake(SEP_10), ref: "i1" };
  const second = { ...intake(SEP_15), ref: "i2" };
  const breaks = findTimelineBreaks([second, first, outcome(SEP_20)]);
  assert.deepEqual(breaks, [{ kind: "repeated-kind", first, second }]);
});

test("two outcomes in a row are a break", () => {
  const breaks = findTimelineBreaks([
    intake("2026-09-01"),
    outcome(SEP_10),
    outcome(SEP_15),
  ]);
  assert.equal(breaks.length, 1);
  assert.equal(breaks[0].kind, "repeated-kind");
});

test("a same-day zero-day stay is not a break", () => {
  assert.deepEqual(findTimelineBreaks([outcome(SEP_10), intake(SEP_10)]), []);
});

test("a same-day leave-and-return is not a break", () => {
  assert.deepEqual(
    findTimelineBreaks([intake(SEP_10), intake(SEP_15), outcome(SEP_15)]),
    [],
  );
});

test("an intake moved past its stay's outcome adds a break", () => {
  assert.equal(findTimelineBreaks([intake(SEP_10), outcome(SEP_15)]).length, 0);
  const moved = findTimelineBreaks([intake(SEP_20), outcome(SEP_15)]);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].kind, "leading-outcome");
});

const SEP_22 = "2026-09-22";

test("a timeline that ends on an outcome agrees with an archived listing only", () => {
  const events = [intake(SEP_10), outcome(SEP_15)];
  assert.equal(findListingMismatch(events, true), null);

  const last = { ...outcome(SEP_15), ref: "o1" };
  assert.deepEqual(findListingMismatch([intake(SEP_10), last], false), {
    kind: "left-but-listed-here",
    lastEvent: last,
    lastDayEvents: [last],
  });
});

test("a timeline that ends on an intake agrees with a listed animal only", () => {
  const events = [intake(SEP_10), outcome(SEP_15), intake(SEP_20)];
  assert.equal(findListingMismatch(events, false), null);

  const last = { ...intake(SEP_20), ref: "i2" };
  assert.deepEqual(
    findListingMismatch([intake(SEP_10), outcome(SEP_15), last], true),
    { kind: "here-but-archived", lastEvent: last, lastDayEvents: [last] },
  );
});

test("an animal with no events is a mismatch unless it is archived", () => {
  assert.equal(findListingMismatch([], true), null);
  assert.deepEqual(findListingMismatch([], false), {
    kind: "no-intake-on-record",
    lastEvent: null,
    lastDayEvents: [],
  });
});

test("a same-day return ends on the intake, so it is not a mismatch while listed", () => {
  
  
  const events = [intake(SEP_10), outcome(SEP_15), intake(SEP_15)];
  assert.equal(findListingMismatch(events, false), null);

  const mismatch = findListingMismatch(events, true);
  assert.equal(mismatch?.kind, "here-but-archived");
  assert.equal(mismatch?.lastEvent?.kind, "intake");
  
  assert.deepEqual(
    mismatch?.lastDayEvents.map((event) => event.kind),
    ["outcome", "intake"],
  );
});

test("a zero-day stay on the last day ends on the outcome", () => {
  const events = [intake(SEP_15), outcome(SEP_15)];
  assert.equal(findListingMismatch(events, true), null);
  const mismatch = findListingMismatch(events, false);
  assert.equal(mismatch?.kind, "left-but-listed-here");
  assert.deepEqual(
    mismatch?.lastDayEvents.map((event) => event.kind),
    ["intake", "outcome"],
  );
});

test("only the last day's events are listed as ambiguous", () => {
  const mismatch = findListingMismatch(
    [intake(SEP_10), outcome(SEP_10), intake(SEP_20)],
    true,
  );
  assert.equal(mismatch?.lastDayEvents.length, 1);
});

test("a break that is not a mismatch is not reported", () => {
  
  
  const events = [intake(SEP_10), intake(SEP_15), outcome(SEP_20)];
  assert.equal(findTimelineBreaks(events).length, 1);
  assert.equal(findListingMismatch(events, true), null);
});

test("the mismatch check and computeStays agree on whether the animal is here", () => {
  const timelines: StayEvent[][] = [
    [],
    [intake(SEP_10)],
    [outcome(SEP_10)],
    [intake(SEP_10), outcome(SEP_15)],
    [outcome(SEP_10), intake(SEP_10)],
    [intake(SEP_10), outcome(SEP_15), intake(SEP_15)],
    [intake(SEP_10), intake(SEP_15)],
    [intake(SEP_10), intake(SEP_15), outcome(SEP_20)],
    [intake(SEP_10), outcome(SEP_15), outcome(SEP_20)],
    [outcome(SEP_10), intake(SEP_15), outcome(SEP_20), intake(SEP_22)],
    [intake(SEP_10), outcome(SEP_10), intake(SEP_10), outcome(SEP_10)],
  ];
  for (const events of timelines) {
    const inCare = computeStays(events, SEP_18).isInCare;
    
    
    
    assert.equal(
      findListingMismatch(events, false) === null,
      inCare,
      JSON.stringify(events),
    );
    assert.equal(
      findListingMismatch(events, true) === null,
      !inCare || events.length === 0,
      JSON.stringify(events),
    );
  }
});
