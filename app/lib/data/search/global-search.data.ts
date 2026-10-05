import { getPhoneSearchSettings } from "@/app/lib/data/shelter-settings.data";
import prisma from "@/app/lib/prisma";
import {
  runGlobalSearch,
  type GlobalSearchGroup,
  type GlobalSearchResults,
} from "./global-search";

export type * from "./global-search";



export const searchEverything = async (
  query: string,
  groups: readonly GlobalSearchGroup[],
): Promise<GlobalSearchResults> => {
  try {
    if (groups.includes("people")) await getPhoneSearchSettings();
    return await runGlobalSearch(prisma, query, groups);
  } catch (error) {
    console.error("Error running global search.", error);
    throw new Error("Error running global search.");
  }
};
