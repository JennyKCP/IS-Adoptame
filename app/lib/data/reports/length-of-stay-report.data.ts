import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { RequirePermission } from "../../auth/protected-actions";
import { resolveReportRange } from "@/app/lib/utils/report-date-utils";
import {
  summarizeLengthOfStay,
  type LengthOfStayStats,
} from "@/app/lib/utils/length-of-stay";
import { _fetchAnimalStayEvents, parseSpeciesIds } from "./report-shared.data";

export type LengthOfStayReport = LengthOfStayStats & {
  fromLabel: string;
  toLabel: string;
};


const _fetchLengthOfStayReport = async (
  from?: string,
  to?: string,
  species?: string,
): Promise<LengthOfStayReport> => {
  try {
    const today = await getShelterToday();
    const range = resolveReportRange(from, to, today);
    const speciesIds = parseSpeciesIds(species);

    
    
    
    
    
    const animals = await _fetchAnimalStayEvents(speciesIds);

    return {
      ...summarizeLengthOfStay(animals, range, today),
      fromLabel: range.fromLabel,
      toLabel: range.toLabel,
    };
  } catch (error) {
    console.error("Error fetching length of stay report.", error);
    throw new Error("Error fetching length of stay report.");
  }
};

export const fetchLengthOfStayReport = RequirePermission(
  AppPermissions.REPORTS_READ,
)(_fetchLengthOfStayReport);
