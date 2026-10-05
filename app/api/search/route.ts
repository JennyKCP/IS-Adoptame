import { getCachedSession } from "@/app/lib/auth/session";
import { hasPermission } from "@/app/lib/auth/hasPermission";
import { searchEverything } from "@/app/lib/data/search/global-search.data";
import { createSearchHandler } from "./search-handler";



export const GET = createSearchHandler({
  getSession: getCachedSession,
  hasPermission,
  search: searchEverything,
});
