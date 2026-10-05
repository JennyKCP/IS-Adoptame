

import { shelterDayKey } from "../utils/shelter-day";


export const observedOnLaterDay = (a: Date, b: Date, timezone: string): boolean =>
  shelterDayKey(a, timezone) > shelterDayKey(b, timezone);


export interface RecordedField {
  key: string;
  label: string;
  concerningValues: readonly string[];
  proposesOnValues: readonly string[];
  
  proposes: { id: string; name: string } | null;
}

export interface RecordedAnswer {
  fieldKey: string;
  value: string;
}


export interface RecordedAssessment {
  id: string;
  templateName: string;
  observedAt: Date;
  
  fields: readonly RecordedField[];
  answers: readonly RecordedAnswer[];
}


export interface CharacteristicProposal {
  characteristicId: string;
  characteristicName: string;
  fieldKey: string;
  fieldLabel: string;
  
  answerValue: string;
}


export interface CharacteristicContradiction {
  characteristicId: string;
  characteristicName: string;
  fieldKey: string;
  fieldLabel: string;
  answerValue: string;
}


export interface ContradictingFinding extends CharacteristicContradiction {
  assessmentId: string;
  templateName: string;
  observedAt: Date;
}


export interface SupersededFinding extends CharacteristicContradiction {
  assessmentId: string;
  supersededBy: { assessmentId: string; templateName: string; observedAt: Date };
}


export interface ActiveCharacteristicAssignment {
  characteristicId: string;
  characteristicName: string;
  
  sourceAssessmentId: string | null;
}

const proposingFields = (fields: readonly RecordedField[]) =>
  fields.filter(
    (f): f is RecordedField & { proposes: { id: string; name: string } } =>
      f.proposes !== null && f.proposesOnValues.length > 0,
  );

const answerFor = (
  a: Pick<RecordedAssessment, "answers">,
  fieldKey: string,
): RecordedAnswer | undefined => a.answers.find((x) => x.fieldKey === fieldKey);


export function proposalsOf(
  a: Pick<RecordedAssessment, "fields" | "answers">,
): CharacteristicProposal[] {
  const out: CharacteristicProposal[] = [];
  for (const field of proposingFields(a.fields)) {
    const answer = answerFor(a, field.key);
    if (answer && field.proposesOnValues.includes(answer.value)) {
      out.push({
        characteristicId: field.proposes.id,
        characteristicName: field.proposes.name,
        fieldKey: field.key,
        fieldLabel: field.label,
        answerValue: answer.value,
      });
    }
  }
  return out;
}


export function contradictionsOf(
  a: Pick<RecordedAssessment, "fields" | "answers">,
): CharacteristicContradiction[] {
  const out: CharacteristicContradiction[] = [];
  for (const field of proposingFields(a.fields)) {
    const answer = answerFor(a, field.key);
    if (answer && field.concerningValues.includes(answer.value)) {
      out.push({
        characteristicId: field.proposes.id,
        characteristicName: field.proposes.name,
        fieldKey: field.key,
        fieldLabel: field.label,
        answerValue: answer.value,
      });
    }
  }
  return out;
}

type Entry<A> = { assessment: A; contradiction: CharacteristicContradiction };


export interface AnimalContradictions<A extends RecordedAssessment> {
  
  live: Map<string, Entry<A>[]>;
  
  superseded: Map<string, (Entry<A> & { supersededBy: A })[]>;
}


export function contradictionsByCharacteristic<A extends RecordedAssessment>(
  assessments: readonly A[],
  timezone: string,
): AnimalContradictions<A> {
  const latestAffirming = new Map<string, A>();
  for (const assessment of assessments) {
    for (const p of proposalsOf(assessment)) {
      const current = latestAffirming.get(p.characteristicId);
      if (!current || assessment.observedAt > current.observedAt) {
        latestAffirming.set(p.characteristicId, assessment);
      }
    }
  }

  const live: AnimalContradictions<A>["live"] = new Map();
  const superseded: AnimalContradictions<A>["superseded"] = new Map();
  for (const assessment of assessments) {
    for (const contradiction of contradictionsOf(assessment)) {
      const id = contradiction.characteristicId;
      const affirming = latestAffirming.get(id);
      if (
        affirming &&
        observedOnLaterDay(affirming.observedAt, assessment.observedAt, timezone)
      ) {
        const list = superseded.get(id) ?? [];
        list.push({ assessment, contradiction, supersededBy: affirming });
        superseded.set(id, list);
      } else {
        const list = live.get(id) ?? [];
        list.push({ assessment, contradiction });
        live.set(id, list);
      }
    }
  }
  return { live, superseded };
}


export function findingsAgainst(
  contradictions: AnimalContradictions<RecordedAssessment>,
  characteristicId: string,
): ContradictingFinding[] {
  return (contradictions.live.get(characteristicId) ?? []).map(
    ({ assessment, contradiction }) => ({
      ...contradiction,
      assessmentId: assessment.id,
      templateName: assessment.templateName,
      observedAt: assessment.observedAt,
    }),
  );
}


export function supersededFindingsOf<A extends RecordedAssessment>(
  assessmentId: string,
  contradictions: AnimalContradictions<A>,
): SupersededFinding[] {
  return [...contradictions.superseded.values()]
    .flat()
    .filter((e) => e.assessment.id === assessmentId)
    .map(
      (e): SupersededFinding => ({
        ...e.contradiction,
        assessmentId: e.assessment.id,
        supersededBy: {
          assessmentId: e.supersededBy.id,
          templateName: e.supersededBy.templateName,
          observedAt: e.supersededBy.observedAt,
        },
      }),
    );
}


export interface CharacteristicSuggestion {
  characteristicId: string;
  characteristicName: string;
  fieldLabel: string;
  answerValue: string;
  
  action: "ADD" | "CITE";
  
  contradictions: ContradictingFinding[];
}


export function suggestionActionFor(
  assignment: Pick<ActiveCharacteristicAssignment, "sourceAssessmentId"> | undefined,
  assessmentId: string,
): CharacteristicSuggestion["action"] | null {
  if (!assignment) return "ADD";
  return assignment.sourceAssessmentId === assessmentId ? null : "CITE";
}

export interface AssessmentCharacteristicsSummary {
  
  suggestions: CharacteristicSuggestion[];
  
  superseded: SupersededFinding[];
}


export function summarizeAssessmentCharacteristics(input: {
  assessment: RecordedAssessment;
  deleted: boolean;
  assignments: readonly ActiveCharacteristicAssignment[];
  liveAssessments: readonly RecordedAssessment[];
  timezone: string;
}): AssessmentCharacteristicsSummary {
  const { assessment, deleted, assignments, liveAssessments, timezone } = input;
  const contradictions = contradictionsByCharacteristic(liveAssessments, timezone);

  
  
  if (deleted) return { suggestions: [], superseded: [] };

  const assignmentById = new Map(
    assignments.map((a) => [a.characteristicId, a]),
  );

  const suggestions: CharacteristicSuggestion[] = [];
  for (const p of proposalsOf(assessment)) {
    const action = suggestionActionFor(
      assignmentById.get(p.characteristicId),
      assessment.id,
    );
    
    if (action === null) continue;
    suggestions.push({
      characteristicId: p.characteristicId,
      characteristicName: p.characteristicName,
      fieldLabel: p.fieldLabel,
      answerValue: p.answerValue,
      action,
      contradictions: findingsAgainst(contradictions, p.characteristicId),
    });
  }

  return {
    suggestions,
    superseded: supersededFindingsOf(assessment.id, contradictions),
  };
}
