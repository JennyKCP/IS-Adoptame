import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDueDay, formatDateOrNA, isFosterPlacementOverdue } from "./date-utils";
import { calendarDay, shiftDayKey } from "./shelter-day";
import { TaskStatus } from "@/prisma/generated/enums";




const TODAY = calendarDay("2026-09-21");
const day = (offset: number) => shiftDayKey(TODAY, offset);

test("isFosterPlacementOverdue: no date set is never overdue", () => {
  
  
  assert.equal(isFosterPlacementOverdue(null, TODAY), false);
  assert.equal(isFosterPlacementOverdue(undefined, TODAY), false);
});

test("isFosterPlacementOverdue: a past day is overdue", () => {
  assert.equal(isFosterPlacementOverdue(day(-1), TODAY), true);
  assert.equal(isFosterPlacementOverdue(day(-4), TODAY), true);
});

test("isFosterPlacementOverdue: a placement expected back today is not yet overdue", () => {
  
  
  assert.equal(isFosterPlacementOverdue(TODAY, TODAY), false);
});

test("isFosterPlacementOverdue: a future day is not overdue", () => {
  assert.equal(isFosterPlacementOverdue(day(1), TODAY), false);
  assert.equal(isFosterPlacementOverdue(day(9), TODAY), false);
});

test("isFosterPlacementOverdue: the year boundary compares correctly", () => {
  
  
  const newYear = calendarDay("2027-01-01");
  assert.equal(isFosterPlacementOverdue("2026-12-31", newYear), true);
  assert.equal(isFosterPlacementOverdue("2027-01-02", newYear), false);
});

test("formatDueDay: an undated task reads N/A", () => {
  assert.equal(formatDueDay(null, TaskStatus.TODO, TODAY), "N/A");
  assert.equal(formatDueDay(undefined, TaskStatus.TODO, TODAY), "N/A");
});

test("formatDueDay: a task due today says so rather than a zero distance", () => {
  assert.equal(formatDueDay(TODAY, TaskStatus.TODO, TODAY), "Today");
});

test("formatDueDay: an open task past its day is overdue by whole days", () => {
  assert.equal(
    formatDueDay(day(-3), TaskStatus.TODO, TODAY),
    "Overdue by 3 days",
  );
  assert.equal(
    formatDueDay(day(-1), TaskStatus.IN_PROGRESS, TODAY),
    "Overdue by 1 day",
  );
});

test("formatDueDay: a closed task past its day is not overdue", () => {
  
  
  assert.equal(formatDueDay(day(-3), TaskStatus.DONE, TODAY), "3 days ago");
});

test("formatDueDay: a future day reads as a distance ahead", () => {
  assert.equal(formatDueDay(day(2), TaskStatus.TODO, TODAY), "in 2 days");
});

test("formatDueDay: a value that is not a day does not throw out of a cell", () => {
  
  
  assert.equal(
    formatDueDay("not-a-day", TaskStatus.TODO, TODAY),
    "Invalid Date",
  );
});

test("formatDateOrNA: null and undefined return N/A", () => {
  assert.equal(formatDateOrNA(null), "N/A");
  assert.equal(formatDateOrNA(undefined), "N/A");
});

test("formatDateOrNA: invalid input returns Invalid Date", () => {
  assert.equal(formatDateOrNA("not-a-date"), "Invalid Date");
});

