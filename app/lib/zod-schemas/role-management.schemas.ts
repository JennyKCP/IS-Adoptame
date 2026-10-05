import { z } from "zod";
import {
  authIdSchema,
  currentPageSchema,
  pageSizeSchema,
  searchQuerySchema,
} from "./common.schemas";
import { Role } from "@/prisma/generated/enums";


export const UsersRoleParamsSchema = z.object({
  query: searchQuerySchema,
  currentPage: currentPageSchema,
  sort: z.string().optional(),
  role: z
    .string()
    .optional()
    .transform((val) => val?.split(",").filter(Boolean))
    .pipe(
      z.array(z.enum(Object.values(Role) as [string, ...string[]])).optional(),
    ),
  pageSize: pageSizeSchema,
  status: z
    .string()
    .optional()
    .transform((val) => val?.split(",").filter(Boolean))
    .pipe(z.array(z.enum(["active", "deactivated"])).optional()),
});




const reasonSchema = z
  .string()
  .trim()
  .max(500, { error: "Keep the reason under 500 characters." });

export const DeactivateUserSchema = z.object({
  userId: authIdSchema,
  
  
  reason: reasonSchema.min(1, { error: "Say why this account is being deactivated." }),
});

export const ReactivateUserSchema = z.object({
  userId: authIdSchema,
  
  reason: reasonSchema,
});
