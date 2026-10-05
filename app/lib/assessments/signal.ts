import { AssessmentSignal } from "@/prisma/generated/enums";


export const SIGNAL_ORDER: readonly AssessmentSignal[] = [
  AssessmentSignal.NO_CONCERNS,
  AssessmentSignal.MONITOR,
  AssessmentSignal.FOLLOW_UP,
  AssessmentSignal.ESCALATE,
];

const rank = (signal: AssessmentSignal): number =>
  SIGNAL_ORDER.indexOf(signal);


export const maxSignal = (
  a: AssessmentSignal,
  b: AssessmentSignal,
): AssessmentSignal => (rank(a) >= rank(b) ? a : b);


export const deriveSignal = (
  chosen: AssessmentSignal,
  concerningAnswerCount: number,
): AssessmentSignal =>
  concerningAnswerCount > 0
    ? maxSignal(chosen, AssessmentSignal.MONITOR)
    : chosen;

const SIGNAL_LABELS: Record<AssessmentSignal, string> = {
  [AssessmentSignal.NO_CONCERNS]: "No concerns",
  [AssessmentSignal.MONITOR]: "Monitor",
  [AssessmentSignal.FOLLOW_UP]: "Follow up",
  [AssessmentSignal.ESCALATE]: "Escalate",
};

export const formatSignal = (signal: AssessmentSignal): string =>
  SIGNAL_LABELS[signal];
