import { Fragment } from "react";
import Link from "next/link";
import type { ContradictingFinding } from "@/app/lib/assessments/proposals";
import { formatDateToLongString } from "@/app/lib/utils/date-utils";


export const FindingsAgainst = ({
  animalId,
  findings,
  lead = "Contradicted by",
}: {
  animalId: string;
  findings: ContradictingFinding[];
  lead?: string;
}) => (
  <>
    {lead}{" "}
    {findings.map((f, i) => (
      <Fragment key={`${f.assessmentId}:${f.fieldKey}`}>
        {i > 0 && "; "}“{f.fieldLabel}”: {f.answerValue} on the{" "}
        <Link
          href={`/dashboard/animals/${animalId}/assessments/${f.assessmentId}`}
          className="font-medium underline underline-offset-2 hover:text-foreground"
        >
          {f.templateName} of {formatDateToLongString(new Date(f.observedAt))}
        </Link>
      </Fragment>
    ))}
    .
  </>
);
