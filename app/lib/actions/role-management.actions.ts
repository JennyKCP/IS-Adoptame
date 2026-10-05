"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role } from "@/prisma/generated/enums";
import { Prisma } from "@/prisma/generated/client";
import prisma from "@/app/lib/prisma";
import { authIdSchema } from "../zod-schemas/common.schemas";
import {
  DeactivateUserSchema,
  ReactivateUserSchema,
} from "../zod-schemas/role-management.schemas";
import {
  RequirePermission,
  withAuthenticatedUser,
  type SessionUser,
} from "../auth/protected-actions";
import { AppPermissions } from "../auth/permissions";
import { ConflictError, NotFoundError } from "../utils/errors";
import {
  deactivateAccount,
  reactivateAccount,
} from "../services/user-deactivation";

const ROLE_MANAGEMENT_PATH = "/dashboard/settings/role-management";


const UpdateUserRoleSchema = z.object({
  userId: authIdSchema,
  
  role: z.enum(Role).refine((role) => role !== Role.ADMIN, {
    error: "Assigning the Admin role is not permitted here.",
  }),
});

const _updateUserRole = async (userId: string, newRole: Role) => {
  const validation = UpdateUserRoleSchema.safeParse({ userId, role: newRole });

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message || "Invalid input provided.",
    };
  }

  const { userId: validatedUserId, role: validatedRole } = validation.data;

  try {
    await prisma.user.update({
      where: {
        id: validatedUserId,
        
        NOT: {
          role: Role.ADMIN,
        },
      },
      data: {
        role: validatedRole,
      },
    });

    revalidatePath(ROLE_MANAGEMENT_PATH);

    return {
      success: true,
      message: "User role updated successfully.",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      
      
      return {
        success: false,
        message:
          "User not found, or this user is an admin and cannot be modified here.",
      };
    }

    console.error("Failed to update user role:", error);
    return {
      success: false,
      message: "Database error: Could not update the user's role.",
    };
  }
};

export const updateUserRole = RequirePermission(AppPermissions.MANAGE_ROLES)(
  _updateUserRole
);


const _setAccountDeactivated = async (
  actor: SessionUser,
  userId: string,
  reason: string,
  deactivate: boolean,
) => {
  const validation = (
    deactivate ? DeactivateUserSchema : ReactivateUserSchema
  ).safeParse({ userId, reason });
  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message || "Invalid input provided.",
    };
  }
  const input = validation.data;
  const acting = { userId: actor.id, personId: actor.personId };

  let personId: string;
  try {
    ({ personId } = await prisma.$transaction((tx) =>
      deactivate
        ? deactivateAccount(tx, input.userId, acting, { reason: input.reason })
        : reactivateAccount(tx, input.userId, acting, { reason: input.reason || null }),
    ));
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      return { success: false, message: error.message };
    }
    console.error("Failed to change account state:", error);
    return {
      success: false,
      message: "Database error: Could not update the account.",
    };
  }

  revalidatePath(ROLE_MANAGEMENT_PATH);
  
  revalidatePath(`/dashboard/people-directory/${personId}`, "layout");

  return {
    success: true,
    message: deactivate
      ? "Account deactivated. It can no longer sign in."
      : "Account reactivated. It can sign in again.",
  };
};

const _deactivateUser = (actor: SessionUser, userId: string, reason: string) =>
  _setAccountDeactivated(actor, userId, reason, true);

const _reactivateUser = (actor: SessionUser, userId: string, reason: string) =>
  _setAccountDeactivated(actor, userId, reason, false);

export const deactivateUser = withAuthenticatedUser(
  RequirePermission(AppPermissions.MANAGE_ROLES)(_deactivateUser),
);

export const reactivateUser = withAuthenticatedUser(
  RequirePermission(AppPermissions.MANAGE_ROLES)(_reactivateUser),
);
