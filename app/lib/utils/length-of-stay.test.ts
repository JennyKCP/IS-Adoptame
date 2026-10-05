import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDay } from "./shelter-day";
import type { StayEvent } from "./stay-utils";
import {
  summarizeLengthOfStay,
  type AnimalStayHistory,
} from "./length-of-stay";


const day = calendarDay;
const intake = (d: string): StayEvent => ({ kind: "intake", date: day(d) });
const outcome = (d: string): StayEvent => ({ kind: "outcome", date: day(d) });

const TODAY = day("2026-09-30");
const ALL_YEAR = { fromLabel: day("2026-01-01"), toLabel: TODAY };

const animal = (name: string, events: StayEvent[]): AnimalStayHistory => ({
  id: `id-${name}`,
  name,
  speciesName: "Dog",
  events,
});

test("the worklist shows a returning animal's open stay, not its first", () => {
  const { worklist } = summarizeLengthOfStay(
    [
      animal("Back again", [
        intake("2026-03-01"),
        outcome("2026-03-11"),
        intake("2026-09-20"),
      ]),
    ],
    ALL_YEAR,
    TODAY,
  );

  assert.deepEqual(worklist, [
    {
      animalId: "id-Back again",
      name: "Back again",
      speciesName: "Dog",
      currentStayDays: 10,
      cumulativeDays: 20,
      hasPriorStays: true,
      intakeDate: "2026-09-20",
    },
  ]);
});

test("an animal taken in today is on the worklist with no days yet", () => {
  const { worklist, inCareNow } = summarizeLengthOfStay(
    [animal("New today", [intake("2026-09-30")])],
    ALL_YEAR,
    TODAY,
  );

  assert.equal(inCareNow, 1);
  assert.equal(worklist[0].currentStayDays, 0);
  assert.equal(worklist[0].cumulativeDays, 0);
  assert.equal(worklist[0].hasPriorStays, false);
  assert.equal(worklist[0].intakeDate, "2026-09-30");
});

test("the worklist is longest stay first, then longest in care overall, then by name", () => {
  const { worklist } = summarizeLengthOfStay(
    [
      animal("Short", [intake("2026-09-25")]),
      animal("Bravo", [intake("2026-09-10")]),
      animal("Alpha", [intake("2026-09-10")]),
      animal("Returned", [
        intake("2026-01-01"),
        outcome("2026-01-05"),
        intake("2026-09-10"),
      ]),
      animal("Gone", [intake("2026-01-01"), outcome("2026-09-01")]),
    ],
    ALL_YEAR,
    TODAY,
  );

  assert.deepEqual(
    worklist.map((row) => row.name),
    ["Returned", "Alpha", "Bravo", "Short"],
  );
});

test("the worklist stops at 20, while the in-care counts take every animal", () => {
  
  
  
  const animals = Array.from({ length: 30 }, (_, i) => {
    const intakeDay = new Date(Date.parse(`${TODAY}T00:00:00Z`) - (119 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return animal(`Animal ${String(i).padStart(2, "0")}`, [intake(intakeDay)]);
  });

  const { worklist, inCareNow, over90 } = summarizeLengthOfStay(
    animals,
    ALL_YEAR,
    TODAY,
  );

  assert.equal(worklist.length, 20);
  assert.equal(worklist[0].currentStayDays, 119);
  assert.equal(worklist[19].currentStayDays, 100);
  assert.equal(inCareNow, 30);
  assert.equal(over90, 29);
});

test("the completed-stay stats take only stays whose outcome is in the range", () => {
  const stats = summarizeLengthOfStay(
    [
      
      
      animal("Week", [intake("2026-02-01"), outcome("2026-02-08")]),
      animal("Eight", [intake("2026-02-01"), outcome("2026-02-09")]),
      animal("Month", [intake("2026-02-01"), outcome("2026-03-03")]),
      animal("Month and a day", [intake("2026-02-01"), outcome("2026-03-04")]),
      animal("Ninety", [intake("2026-02-01"), outcome("2026-05-02")]),
      animal("Long", [intake("2026-02-01"), outcome("2026-05-03")]),
      
      animal("Last year", [intake("2025-12-01"), outcome("2025-12-31")]),
      
      animal("Here", [intake("2026-09-01")]),
    ],
    ALL_YEAR,
    TODAY,
  );

  assert.equal(stats.completedCount, 6);
  assert.equal(stats.medianDays, 30.5);
  assert.equal(stats.longestCompletedDays, 91);
  assert.deepEqual(stats.histogram, [
    { label: "0–7", count: 1 },
    { label: "8–30", count: 2 },
    { label: "31–90", count: 2 },
    { label: "90+", count: 1 },
  ]);
});

test("a completed stay counts with its outcome on either end of the range, each stay apart", () => {
  const stats = summarizeLengthOfStay(
    [
      
      animal("Twice", [
        intake("2026-02-01"),
        outcome("2026-02-01"),
        intake("2026-03-01"),
        outcome("2026-03-11"),
      ]),
      
      animal("Last day", [intake("2026-03-11"), outcome("2026-03-31")]),
      
      animal("Day before", [intake("2026-01-01"), outcome("2026-01-31")]),
      animal("Day after", [intake("2026-03-01"), outcome("2026-04-01")]),
    ],
    { fromLabel: day("2026-02-01"), toLabel: day("2026-03-31") },
    TODAY,
  );

  assert.equal(stats.completedCount, 3);
  assert.equal(stats.medianDays, 10);
  assert.equal(stats.longestCompletedDays, 20);
  assert.deepEqual(stats.histogram, [
    { label: "0–7", count: 1 },
    { label: "8–30", count: 2 },
    { label: "31–90", count: 0 },
    { label: "90+", count: 0 },
  ]);
});

test("a past range bounds the completed-stay stats, but the worklist is as of today", () => {
  const stats = summarizeLengthOfStay(
    [
      
      animal("In range", [intake("2026-02-01"), outcome("2026-02-11")]),
      
      animal("After", [intake("2026-03-01"), outcome("2026-05-01")]),
      
      animal("Still here", [intake("2026-02-01")]),
    ],
    { fromLabel: day("2026-01-01"), toLabel: day("2026-03-31") },
    TODAY,
  );

  assert.equal(stats.completedCount, 1);
  assert.equal(stats.longestCompletedDays, 10);
  assert.equal(stats.inCareNow, 1);
  assert.equal(stats.worklist[0].currentStayDays, 241);
  assert.equal(stats.over90, 1);
});

test("with no completed stays in range, the median and longest are empty", () => {
  const stats = summarizeLengthOfStay(
    [animal("Here", [intake("2026-09-01")])],
    ALL_YEAR,
    TODAY,
  );

  assert.equal(stats.completedCount, 0);
  assert.equal(stats.medianDays, null);
  assert.equal(stats.longestCompletedDays, null);
});
