

import type { AssessmentSignal, AnimalHealthStatus } from "@/prisma/generated/enums";
import { ACUTE_HEALTH_STATUSES } from "../data/animals/attention-queue";
import type { ReadinessRequirement } from "./requirements";

export type CharacteristicClaimIssue =
  
  | "CONTRADICTED"
  
  | "SOURCE_DELETED"
  
  | "NO_LONGER_SUPPORTED";

export type ReadinessBlocker =
  | {
      kind: "MISSING_ASSESSMENT";
      templateKey: string;
      templateName: string;
      
      since: Date;
    }
  | {
      kind: "ESCALATED_FINDING";
      assessmentId: string;
      templateName: string;
      observedAt: Date;
      since: Date;
    }
  | {
      kind: "UNSUPPORTED_CHARACTERISTIC";
      characteristicId: string;
      characteristicName: string;
      issue: CharacteristicClaimIssue;
      
      since: Date;
    }
  | { kind: "NOT_SPAYED_NEUTERED"; since: Date }
  | {
      kind: "NO_PHOTO";
      
      since: Date;
    }
  | {
      kind: "ACUTE_HEALTH";
      healthStatus: AnimalHealthStatus;
      
      since: null;
    };


export interface ReadinessAssessment {
  id: string;
  templateKey: string;
  templateName: string;
  observedAt: Date;
  signal: AssessmentSignal;
}


export interface ReadinessCharacteristicClaim {
  characteristicId: string;
  characteristicName: string;
  assignedAt: Date;
  
  contradictedAt: Date | null;
  
  sourceDeletedAt: Date | null;
  
  supportLostAt: Date | null;
}

export interface ComputeReadinessInputs {
  
  requirements: ReadinessRequirement[];
  
  assessments: ReadinessAssessment[];
  
  claims: ReadinessCharacteristicClaim[];
  isSpayedNeutered: boolean;
  hasPhoto: boolean;
  healthStatus: AnimalHealthStatus | null;
  
  inCareSince: Date;
}

const laterOf = (a: Date, b: Date): Date => (a > b ? a : b);

function missingAssessmentBlockers(
  requirements: ReadinessRequirement[],
  assessments: ReadinessAssessment[],
  inCareSince: Date,
): ReadinessBlocker[] {
  const blockers: ReadinessBlocker[] = [];
  for (const requirement of requirements) {
    const hasMatch = assessments.some(
      (a) => a.templateKey === requirement.templateKey,
    );
    if (!hasMatch) {
      blockers.push({
        kind: "MISSING_ASSESSMENT",
        templateKey: requirement.templateKey,
        templateName: requirement.templateName,
        since: inCareSince,
      });
    }
  }
  return blockers;
}


function escalatedFindingBlockers(
  assessments: ReadinessAssessment[],
): ReadinessBlocker[] {
  const latestByTemplate = new Map<string, ReadinessAssessment>();
  for (const assessment of assessments) {
    const current = latestByTemplate.get(assessment.templateKey);
    if (!current || assessment.observedAt > current.observedAt) {
      latestByTemplate.set(assessment.templateKey, assessment);
    }
  }
  return [...latestByTemplate.values()]
    .filter((a) => a.signal === "ESCALATE")
    .sort((a, b) => a.templateKey.localeCompare(b.templateKey))
    .map((a) => ({
      kind: "ESCALATED_FINDING" as const,
      assessmentId: a.id,
      templateName: a.templateName,
      observedAt: a.observedAt,
      since: a.observedAt,
    }));
}

function characteristicClaimBlockers(
  claims: ReadinessCharacteristicClaim[],
): ReadinessBlocker[] {
  const blockers: ReadinessBlocker[] = [];
  for (const claim of claims) {
    const blocker = (issue: CharacteristicClaimIssue, evidenceAt: Date) =>
      blockers.push({
        kind: "UNSUPPORTED_CHARACTERISTIC",
        characteristicId: claim.characteristicId,
        characteristicName: claim.characteristicName,
        issue,
        since: laterOf(claim.assignedAt, evidenceAt),
      });

    if (claim.sourceDeletedAt) {
      blocker("SOURCE_DELETED", claim.sourceDeletedAt);
    } else if (claim.supportLostAt) {
      blocker("NO_LONGER_SUPPORTED", claim.supportLostAt);
    }
    if (claim.contradictedAt) {
      blocker("CONTRADICTED", claim.contradictedAt);
    }
  }
  return blockers;
}

export function computeReadiness(
  inputs: ComputeReadinessInputs,
): ReadinessBlocker[] {
  const blockers: ReadinessBlocker[] = [
    ...missingAssessmentBlockers(
      inputs.requirements,
      inputs.assessments,
      inputs.inCareSince,
    ),
    ...escalatedFindingBlockers(inputs.assessments),
    ...characteristicClaimBlockers(inputs.claims),
  ];

  if (!inputs.isSpayedNeutered) {
    blockers.push({ kind: "NOT_SPAYED_NEUTERED", since: inputs.inCareSince });
  }
  if (!inputs.hasPhoto) {
    blockers.push({ kind: "NO_PHOTO", since: inputs.inCareSince });
  }
  if (
    inputs.healthStatus &&
    (ACUTE_HEALTH_STATUSES as readonly AnimalHealthStatus[]).includes(
      inputs.healthStatus,
    )
  ) {
    blockers.push({
      kind: "ACUTE_HEALTH",
      healthStatus: inputs.healthStatus,
      since: null,
    });
  }

  return blockers;
}
