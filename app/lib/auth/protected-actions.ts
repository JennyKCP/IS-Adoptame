import { hasPermission } from "./hasPermission";
import { getCachedSession } from "./session";
import { type AppPermission } from "./permissions";
import { ForbiddenError, UnauthenticatedError } from "../utils/errors";
import type { SessionUser } from "./session.types";

export type { SessionUser };


export function withAuthenticatedUser<TArgs extends unknown[], TReturn>(
  action: (user: SessionUser, ...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const session = await getCachedSession();
    if (!session?.user) {
      throw new UnauthenticatedError(
        "Access Denied. You must be logged in to perform this action.",
      );
    }
    return action(session.user, ...args);
  };
}


export function RequirePermission(requiredPermission: AppPermission) {
  return function <TArgs extends unknown[], TReturn>(
    target: (...args: TArgs) => Promise<TReturn>,
  ) {
    return async (...args: TArgs): Promise<TReturn> => {
      const isAllowed = await hasPermission(requiredPermission);
      if (!isAllowed) {
        throw new ForbiddenError(
          "Access Denied. You do not have permission to perform this action.",
        );
      }
      return target(...args);
    };
  };
}


export function RequireAllPermissions(
  ...requiredPermissions: [AppPermission, ...AppPermission[]]
) {
  return function <TArgs extends unknown[], TReturn>(
    target: (...args: TArgs) => Promise<TReturn>,
  ) {
    return async (...args: TArgs): Promise<TReturn> => {
      for (const permission of requiredPermissions) {
        if (!(await hasPermission(permission))) {
          throw new ForbiddenError(
            "Access Denied. You do not have permission to perform this action.",
          );
        }
      }
      return target(...args);
    };
  };
}
