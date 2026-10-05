import { formatSingleEnumOption } from "@/app/lib/utils/enum-formatter";
import {
  FosterReturnReason,
  type OutcomeType,
} from "@/prisma/generated/enums";


export interface PlacementEnd {
  returnReason: FosterReturnReason | null;
  outcome: { type: OutcomeType; reversedAt: Date | null } | null;
}









export const describePlacementEnd = (placement: PlacementEnd) => {
  if (
    placement.returnReason !== FosterReturnReason.ENDED_BY_OUTCOME ||
    !placement.outcome
  ) {
    return formatSingleEnumOption(placement.returnReason);
  }
  const type = formatSingleEnumOption(placement.outcome.type).toLowerCase();
  return placement.outcome.reversedAt
    ? `Ended: ${type} (reversed)`
    : `Ended: ${type}`;
};
