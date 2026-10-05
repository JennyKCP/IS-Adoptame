import {
  formatShelterDayOrNA,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isFosterPlacementOverdue } from "@/app/lib/utils/date-utils";
import { formatSingleEnumOption } from "@/app/lib/utils/enum-formatter";
import { AnimalSectionCardPayload } from "@/app/lib/types";
import { FosterPlacementType } from "@/prisma/generated/enums";

type OpenPlacement = AnimalSectionCardPayload["fosterPlacements"][number];

interface Props {
  placement: OpenPlacement;
  
  
  canReadFosters: boolean;
  canManageFosters: boolean;
  
  today: CalendarDay;
}




export function FosterPlacementBanner({
  placement,
  canReadFosters,
  canManageFosters,
  today,
}: Props) {
  const fosterName = placement.fosterProfile.person.name;
  
  
  const isOverdue = isFosterPlacementOverdue(placement.expectedEndDate, today);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <Home className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
        <p className="text-blue-900 dark:text-blue-100">
          In foster with{" "}
          {canReadFosters ? (
            <Link
              href={`/dashboard/people-directory/${placement.fosterProfile.person.id}/fostering`}
              className="font-semibold underline underline-offset-2"
            >
              {fosterName}
            </Link>
          ) : (
            <span className="font-semibold">a foster</span>
          )}{" "}
          since {formatShelterDayOrNA(placement.startDate)} ·{" "}
          {formatSingleEnumOption(placement.type)}
          {placement.expectedEndDate && (
            <>
              {" · "}expected return{" "}
              {formatShelterDayOrNA(placement.expectedEndDate)}
              {isOverdue && (
                <Badge
                  variant="outline"
                  className="ml-1.5 border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                >
                  Overdue
                </Badge>
              )}
            </>
          )}
        </p>
      </div>

      {canManageFosters && (
        <div className="flex shrink-0 gap-2">
          {placement.type === FosterPlacementType.FOSTER_TO_ADOPT && (
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/dashboard/fosters/placements/${placement.id}/convert`}
              >
                Convert to Adoption
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/fosters/placements/${placement.id}/return`}>
              Return from Foster
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
