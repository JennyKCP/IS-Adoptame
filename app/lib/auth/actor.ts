import { can } from "./can";
import { type AppPermission } from "./permissions";
import { ForbiddenError, PreconditionFailedError } from "../utils/errors";
import type { SessionUser } from "./session.types";


export type Actor = {
  userId: string;
  personId: string;
  role: string;
};


export function toActor(user: SessionUser): Actor {
  if (!user.personId) {
    throw new PreconditionFailedError(
      "Authentication Error: Your user account is not associated with a person record.",
    );
  }

  return {
    userId: user.id,
    personId: user.personId,
    role: user.role ?? "",
  };
}


export function requireFor(actor: Actor, permission: AppPermission): void {
  if (!can(actor.role, permission)) {
    throw new ForbiddenError(
      "Access Denied. You do not have permission to perform this action.",
    );
  }
}
