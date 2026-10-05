import { cache } from "react";
import { getCachedSession } from "./session";
import { can } from "./can";
import { type AppPermission } from "./permissions";


export const hasPermission = cache(async (requiredPermission: AppPermission) => {
  const session = await getCachedSession();
  return can(session?.user?.role, requiredPermission);
});
