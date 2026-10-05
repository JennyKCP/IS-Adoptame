
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromZonedTime } from "date-fns-tz";
const SHELTER_TIMEZONE = "America/New_York";
import {
  contradictionsByCharacteristic as rawContradictionsByCharacteristic,
  contradictionsOf,
  proposalsOf,
  suggestionActionFor,
  summarizeAssessmentCharacteristics,
  type ActiveCharacteristicAssignment,
  type RecordedAssessment,
  type RecordedField,
} from "./proposals";

const contradictionsByCharacteristic = <A extends RecordedAssessment>(assessments: readonly A[]) => rawContradictionsByCharacteristic(assessments, SHELTER_TIMEZONE);

const CATS = { id: "char-cats", name: "Good with cats" };
const DOGS = { id: "char-dogs", name: "Good with other dogs" };

const catRecommendation: RecordedField = {
  key: "recommendation",
  label: "Recommendation",
  concerningValues: ["Not cat-safe"],
  proposesOnValues: ["Cat-safe"],
  proposes: CATS,
};

const dogRecommendation: RecordedField = {
  key: "recommendation",
  label: "Recommendation",
  concerningValues: ["Solo-dog home"],
  proposesOnValues: ["Dog-social"],
  proposes: DOGS,
};

const day = (n: number) => new Date(Date.UTC(2026, 8, n));


const at = (n: number, time: string) =>
  fromZonedTime(`2026-09-${String(n).padStart(2, "0")} ${time}`, SHELTER_TIMEZONE);


const catTest = (
  id: string,
  value: string | null,
  observed: number | Date,
): RecordedAssessment => ({
  id,
  templateName: "Cat Test",
  observedAt: typeof observed === "number" ? day(observed) : observed,
  fields: [catRecommendation],
  answers: value === null ? [] : [{ fieldKey: "recommendation", value }],
});

const assigned = (
  characteristic: { id: string; name: string },
  source: string | null,
): ActiveCharacteristicAssignment => ({
  characteristicId: characteristic.id,
  characteristicName: characteristic.name,
  sourceAssessmentId: source,
});


const summarize = (
  assessment: RecordedAssessment,
  assignments: ActiveCharacteristicAssignment[],
  others: RecordedAssessment[] = [],
  deleted = false,
) =>
  summarizeAssessmentCharacteristics({
    assessment,
    deleted,
    assignments,
    liveAssessments: deleted ? others : [assessment, ...others],
    timezone: SHELTER_TIMEZONE,
  });



test("an affirming answer proposes the trait its field row points at", () => {
  assert.deepEqual(proposalsOf(catTest("a", "Cat-safe", 1)), [
    {
      characteristicId: "char-cats",
      characteristicName: "Good with cats",
      fieldKey: "recommendation",
      fieldLabel: "Recommendation",
      answerValue: "Cat-safe",
    },
  ]);
});

test("a neutral, concerning or missing answer proposes nothing", () => {
  for (const value of ["Cat-tolerant with management", "Not cat-safe", null]) {
    assert.deepEqual(proposalsOf(catTest("a", value, 1)), []);
  }
});

test("a concerning answer on a proposing field contradicts the trait", () => {
  const [c] = contradictionsOf(catTest("a", "Not cat-safe", 1));
  assert.equal(c.characteristicId, "char-cats");
  assert.equal(c.answerValue, "Not cat-safe");
  assert.deepEqual(contradictionsOf(catTest("a", "Cat-safe", 1)), []);
});

test("answers are judged by the field row they were recorded on", () => {
  
  const v1 = {
    ...catTest("a", "Safe around cats", 1),
    fields: [{ ...catRecommendation, proposesOnValues: ["Safe around cats"] }],
  };
  assert.equal(proposalsOf(v1)[0]?.characteristicId, "char-cats");
});

test("a field whose trait was retired from the catalog proposes and contradicts nothing", () => {
  const retired = (value: string) => ({
    ...catTest("a", value, 1),
    fields: [{ ...catRecommendation, proposes: null }],
  });
  assert.deepEqual(proposalsOf(retired("Cat-safe")), []);
  assert.deepEqual(contradictionsOf(retired("Not cat-safe")), []);
});



test("contradictions are grouped by trait across assessments", () => {
  const { live } = contradictionsByCharacteristic([
    catTest("cat-1", "Not cat-safe", 5),
    catTest("cat-2", "Not cat-safe", 3),
    {
      id: "dog-1",
      templateName: "Dog-to-Dog Introduction",
      observedAt: day(4),
      fields: [dogRecommendation],
      answers: [{ fieldKey: "recommendation", value: "Solo-dog home" }],
    },
  ]);
  assert.deepEqual([...live.keys()].sort(), ["char-cats", "char-dogs"]);
  assert.deepEqual(
    live.get("char-cats")?.map((e) => e.assessment.id),
    ["cat-1", "cat-2"],
  );
});

test("a later affirming finding supersedes an older contradiction", () => {
  const { live, superseded } = contradictionsByCharacteristic([
    catTest("retest", "Cat-safe", 10),
    catTest("first", "Not cat-safe", 2),
  ]);
  assert.equal(live.size, 0);
  const [entry] = superseded.get("char-cats") ?? [];
  assert.equal(entry.assessment.id, "first");
  assert.equal(entry.supersededBy.id, "retest");
});

test("a contradiction observed after the latest affirming finding still counts", () => {
  const { live, superseded } = contradictionsByCharacteristic([
    catTest("second", "Not cat-safe", 12),
    catTest("retest", "Cat-safe", 10),
    catTest("first", "Not cat-safe", 2),
  ]);
  assert.deepEqual(
    live.get("char-cats")?.map((e) => e.assessment.id),
    ["second"],
  );
  assert.deepEqual(
    superseded.get("char-cats")?.map((e) => e.assessment.id),
    ["first"],
  );
});

test("a backdated affirming finding doesn't supersede a newer contradiction", () => {
  const { live } = contradictionsByCharacteristic([
    catTest("not-safe", "Not cat-safe", 9),
    catTest("backdated", "Cat-safe", 5),
  ]);
  assert.equal(live.get("char-cats")?.length, 1);
});

test("an affirming and a contradicting finding on the same day: the contradiction stands, whichever clock time is later", () => {
  
  
  for (const [affirmingAt, contradictingAt] of [
    [at(7, "16:30"), at(7, "09:00")],
    [at(7, "09:00"), at(7, "16:30")],
    [at(7, "00:00"), at(7, "23:59")],
    [at(7, "23:59"), at(7, "00:00")],
  ]) {
    const { live, superseded } = contradictionsByCharacteristic([
      catTest("affirming", "Cat-safe", affirmingAt),
      catTest("contradicting", "Not cat-safe", contradictingAt),
    ]);
    assert.equal(live.get("char-cats")?.length, 1);
    assert.equal(superseded.size, 0);
  }
});

test("the observation day is the shelter's, not UTC's", () => {
  
  
  const { superseded } = contradictionsByCharacteristic([
    catTest("affirming", "Cat-safe", at(8, "00:30")),
    catTest("contradicting", "Not cat-safe", at(7, "23:30")),
  ]);
  assert.equal(superseded.get("char-cats")?.length, 1);

  const { live } = contradictionsByCharacteristic([
    catTest("affirming", "Cat-safe", at(7, "23:00")),
    catTest("contradicting", "Not cat-safe", at(7, "01:00")),
  ]);
  assert.equal(live.get("char-cats")?.length, 1);
});








test("state table: unassigned — suggests adding it", () => {
  const here = catTest("here", "Cat-safe", 1);
  const [s] = summarize(here, []).suggestions;
  assert.equal(s.characteristicId, "char-cats");
  assert.equal(s.action, "ADD");
  assert.deepEqual(s.contradictions, []);
});

test("state table: cited by this assessment — nothing to suggest", () => {
  const here = catTest("here", "Cat-safe", 1);
  assert.deepEqual(summarize(here, [assigned(CATS, "here")]).suggestions, []);
});

test("acting on a suggestion this assessment already cites does nothing", () => {
  
  
  assert.equal(suggestionActionFor(assigned(CATS, "here"), "here"), null);
  assert.equal(suggestionActionFor(assigned(CATS, "elsewhere"), "here"), "CITE");
  assert.equal(suggestionActionFor(undefined, "here"), "ADD");
});

test("state table: cited elsewhere — suggests citing this one instead", () => {
  const here = catTest("here", "Cat-safe", 1);
  const [s] = summarize(here, [assigned(CATS, "elsewhere")]).suggestions;
  assert.equal(s.action, "CITE");
});

test("state table: added by hand — suggests citing this one", () => {
  const here = catTest("here", "Cat-safe", 1);
  const [s] = summarize(here, [assigned(CATS, null)]).suggestions;
  assert.equal(s.action, "CITE");
});

test("state table: removed — reads the same as unassigned", () => {
  
  const here = catTest("here", "Cat-safe", 1);
  const [s] = summarize(here, []).suggestions;
  assert.equal(s.action, "ADD");
});

test("state table: deleted source — nothing to suggest, nothing superseded", () => {
  const here = catTest("here", "Cat-safe", 1);
  const summary = summarize(here, [assigned(CATS, "here")], [], true);
  assert.deepEqual(summary.suggestions, []);
  assert.deepEqual(summary.superseded, []);

  
  for (const assignments of [[], [assigned(CATS, "elsewhere")]]) {
    assert.deepEqual(summarize(here, assignments, [], true).suggestions, []);
  }

  
  
  
  const overtaken = catTest("overtaken", "Not cat-safe", 2);
  const newer = catTest("newer", "Cat-safe", 10);
  assert.deepEqual(
    summarizeAssessmentCharacteristics({
      assessment: overtaken,
      deleted: true,
      assignments: [],
      liveAssessments: [overtaken, newer],
      timezone: SHELTER_TIMEZONE,
    }).superseded,
    [],
  );
});

test("state table: restored — resumes reading as its citation now stands", () => {
  
  
  const here = catTest("here", "Cat-safe", 1);
  assert.deepEqual(
    summarize(here, [assigned(CATS, "here")], [], false).suggestions,
    [],
  );
});

test("state table: edited away — no longer proposes, so no row at all", () => {
  const here = catTest("here", "Cat-tolerant with management", 1);
  assert.deepEqual(summarize(here, [assigned(CATS, "here")]).suggestions, []);
  assert.deepEqual(summarize(here, []).suggestions, []);
});

test("state table: contradicted, live — a warning under the suggestion, never a gate", () => {
  const affirming = catTest("affirming", "Cat-safe", 3);
  const contradicting = catTest("contradicting", "Not cat-safe", 9);
  const [s] = summarize(affirming, [], [contradicting]).suggestions;
  assert.equal(s.action, "ADD");
  assert.equal(s.contradictions.length, 1);
  assert.equal(s.contradictions[0].assessmentId, "contradicting");

  
  
  
  assert.deepEqual(
    summarize(contradicting, [], [affirming]).suggestions,
    [],
  );
});

test("state table: contradicted, overtaken — superseded on the older page, no warning elsewhere", () => {
  const older = catTest("older", "Not cat-safe", 2);
  const newer = catTest("newer", "Cat-safe", 10);

  const onOlder = summarize(older, [], [newer]);
  assert.deepEqual(onOlder.suggestions, []); 
  assert.equal(onOlder.superseded.length, 1);
  assert.equal(onOlder.superseded[0].supersededBy.assessmentId, "newer");

  
  
  const onNewer = summarize(newer, [], [older]);
  assert.equal(onNewer.suggestions[0]?.contradictions.length, 0);
});

test("state table: catalog rename — matched by id; only the shown name changes", () => {
  const renamed = { id: "char-cats", name: "Cat-friendly" };
  const here = {
    ...catTest("here", "Cat-safe", 1),
    fields: [{ ...catRecommendation, proposes: renamed }],
  };
  
  
  assert.deepEqual(summarize(here, [assigned(CATS, "here")]).suggestions, []);
  
  const [s] = summarize(here, [assigned(CATS, "elsewhere")]).suggestions;
  assert.equal(s.characteristicName, "Cat-friendly");
});

test("a template with no proposing fields has no suggestions and nothing superseded", () => {
  
  
  const handling: RecordedAssessment = {
    id: "handling",
    templateName: "Handling Sensitivity",
    observedAt: day(5),
    fields: [
      {
        key: "overall",
        label: "Overall handling sensitivity",
        concerningValues: ["High"],
        proposesOnValues: [],
        proposes: null,
      },
      {
        key: "notes",
        label: "Notes",
        concerningValues: [],
        proposesOnValues: [],
        proposes: null,
      },
    ],
    answers: [
      { fieldKey: "overall", value: "High" },
      { fieldKey: "notes", value: "Good with cats" },
    ],
  };
  
  const overtaken = catTest("overtaken", "Not cat-safe", 2);
  const affirming = catTest("affirming", "Cat-safe", 9);

  const summary = summarize(
    handling,
    [assigned(CATS, "affirming")],
    [overtaken, affirming],
  );
  assert.deepEqual(summary.suggestions, []);
  assert.deepEqual(summary.superseded, []);
});
