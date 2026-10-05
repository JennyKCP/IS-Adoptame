import { Role } from "@/prisma/generated/enums";
import { rolePermissions } from "./roles.config";
import { type AppPermission } from "./permissions";


export function can(
  role: string | null | undefined,
  permission: AppPermission,
): boolean {
  
  
  
  return (rolePermissions[role as Role] ?? []).includes(permission);
}
