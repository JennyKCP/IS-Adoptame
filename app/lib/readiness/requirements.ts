

import {
  ASSESSMENT_TEMPLATES,
  getActiveTemplate,
  type AssessmentTemplateDef,
} from "../assessments/templates";

const READINESS_STAGES = new Set(["intake", "adoption-prep"]);

export interface ReadinessRequirement {
  templateKey: string;
  templateName: string;
}

const activeStageGatedTemplates = (): AssessmentTemplateDef[] => {
  const keys = new Set(ASSESSMENT_TEMPLATES.map((t) => t.key));
  const active: AssessmentTemplateDef[] = [];
  for (const key of keys) {
    const template = getActiveTemplate(key);
    if (template?.stage !== undefined && READINESS_STAGES.has(template.stage)) {
      active.push(template);
    }
  }
  return active;
};


export function readinessRequirementsFor(
  speciesName: string,
): ReadinessRequirement[] {
  return activeStageGatedTemplates()
    .filter((t) => !t.species || t.species === speciesName)
    .map((t) => ({
      templateKey: t.key,
      templateName: t.name,
    }));
}
