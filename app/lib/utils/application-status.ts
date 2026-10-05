import { ApplicationStatus, OutcomeType } from "@/prisma/generated/enums";
import { formatSingleEnumOption } from "./enum-formatter";
import {
  EffectiveApplicationStatus,
  isReviewStatus,
} from "./derive-application-status";


























export const ALLOWED_APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  [ApplicationStatus.PENDING]: [
    ApplicationStatus.REVIEWING,
    ApplicationStatus.WAITLISTED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.REVIEWING]: [
    ApplicationStatus.WAITLISTED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.WAITLISTED]: [
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.APPROVED]: [
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};




export const allowedNextStatuses = (
  status: EffectiveApplicationStatus,
): readonly ApplicationStatus[] =>
  isReviewStatus(status) ? ALLOWED_APPLICATION_TRANSITIONS[status] : [];














export const BLOCKING_APPLICATION_STATUSES: EffectiveApplicationStatus[] = [
  EffectiveApplicationStatus.PENDING,
  EffectiveApplicationStatus.REVIEWING,
  EffectiveApplicationStatus.WAITLISTED,
  EffectiveApplicationStatus.APPROVED,
  EffectiveApplicationStatus.REJECTED,
  EffectiveApplicationStatus.WITHDRAWN,
  EffectiveApplicationStatus.ADOPTED,
];













export const STAFF_OVERRIDABLE_APPLICATION_STATUSES: EffectiveApplicationStatus[] = [
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
];







export const ACTIVE_APPLICATION_STATUSES: EffectiveApplicationStatus[] =
  BLOCKING_APPLICATION_STATUSES.filter(
    (status) => !STAFF_OVERRIDABLE_APPLICATION_STATUSES.includes(status),
  );













export const REACTIVATION_BLOCKING_STATUSES: EffectiveApplicationStatus[] =
  BLOCKING_APPLICATION_STATUSES.filter(
    (status) => status !== ApplicationStatus.WITHDRAWN,
  );








export const APPLICANT_EDITABLE_STATUSES: EffectiveApplicationStatus[] = [
  ApplicationStatus.PENDING,
];






export const NON_WITHDRAWABLE_STATUSES: EffectiveApplicationStatus[] = [
  EffectiveApplicationStatus.ADOPTED,
  EffectiveApplicationStatus.WITHDRAWN,
  EffectiveApplicationStatus.REJECTED,
  EffectiveApplicationStatus.CLOSED,
];










export const STAFF_EDITABLE_STATUSES: EffectiveApplicationStatus[] = [
  ApplicationStatus.PENDING,
  ApplicationStatus.REVIEWING,
  ApplicationStatus.WAITLISTED,
  ApplicationStatus.APPROVED,
];





export const STATUS_SORT_RANK: Record<EffectiveApplicationStatus, number> = {
  PENDING: 0,
  REVIEWING: 1,
  WAITLISTED: 2,
  APPROVED: 3,
  REJECTED: 4,
  WITHDRAWN: 5,
  ADOPTED: 6,
  CLOSED: 7,
};










export const CLOSURE_REASON_BY_OUTCOME: Record<OutcomeType, string> = {
  [OutcomeType.ADOPTION]: "This animal was adopted by another applicant.",
  [OutcomeType.TRANSFER_OUT]:
    "This animal was transferred to another organization.",
  [OutcomeType.RETURN_TO_OWNER]: "This animal was reunited with their owner.",
  [OutcomeType.DECEASED]: "This animal is no longer at the shelter.",
  [OutcomeType.EUTHANIZED]: "This animal is no longer at the shelter.",
  [OutcomeType.OTHER]: "This animal is no longer available for adoption.",
};


















export const MY_APPLICATION_STATUS_MESSAGES: Record<
  EffectiveApplicationStatus,
  { title: string; description: string }
> = {
  PENDING: {
    title: "Waiting for review",
    description:
      "Your application has been submitted and is waiting for a staff member to review it. You can still make changes to it while it is pending.",
  },
  REVIEWING: {
    title: "Under review",
    description:
      "A staff member is reviewing your application, so it can no longer be edited. If any of your details have changed, contact the shelter and they can update it for you.",
  },
  WAITLISTED: {
    title: "On the waitlist",
    description:
      "Your application has been reviewed and placed on the waitlist. Another applicant is being considered first — the shelter will be in touch if this animal becomes available to you.",
  },
  APPROVED: {
    title: "Approved",
    description:
      "Your application has been approved and this animal is being held for you. The shelter will contact you to arrange the adoption.",
  },
  REJECTED: {
    title: "Not moving forward",
    description:
      "The shelter has decided not to move forward with this application. Any reason they recorded is shown in the status history below. You are welcome to apply for other animals.",
  },
  WITHDRAWN: {
    title: "Withdrawn by you",
    description:
      "You withdrew this application. If this animal is still available for adoption you can reactivate it; otherwise you are welcome to apply for another animal.",
  },
  ADOPTED: {
    title: "Adoption complete",
    description:
      "This adoption has been finalised. Thank you for adopting — congratulations from all of us at the shelter.",
  },
  CLOSED: {
    title: "No longer available",
    description:
      "This animal is no longer available for adoption, so your application was closed. It is not a decision about you or your application — the reason is shown in the status history below, and if this animal is ever listed again you are welcome to apply.",
  },
};





export const closureReason = ({
  type,
  byFoster,
}: {
  type: OutcomeType;
  byFoster: boolean;
}): string =>
  byFoster
    ? "This animal was adopted by the family fostering them."
    : CLOSURE_REASON_BY_OUTCOME[type];




export const adoptionReason = ({
  byFoster,
}: {
  byFoster: boolean;
}): string =>
  byFoster ? "Animal adopted by their foster." : "Animal adopted by applicant.";






export const formatStatusList = (
  statuses: EffectiveApplicationStatus[],
): string => {
  const labels = statuses.map((status) =>
    formatSingleEnumOption(status).toLowerCase(),
  );
  return labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
    : labels.join("");
};

export const isAllowedTransition = (
  from: EffectiveApplicationStatus,
  to: ApplicationStatus,
): boolean => allowedNextStatuses(from).includes(to);






export const statusChangeNeedsReason = (
  from: EffectiveApplicationStatus,
  to: ApplicationStatus | undefined,
): boolean =>
  to !== undefined &&
  to !== from &&
  !(from === ApplicationStatus.PENDING && to === ApplicationStatus.REVIEWING);

export const illegalTransitionMessage = (
  from: EffectiveApplicationStatus,
  to: ApplicationStatus,
): string =>
  `Cannot change a${/^[aeiou]/i.test(from) ? "n" : ""} ${formatSingleEnumOption(from).toLowerCase()} application to ${formatSingleEnumOption(to).toLowerCase()}.`;
