import { ORPCError, os } from "@orpc/server";
import type { UserRole } from "@/modules/auth/schema";
import type { AppContext } from "./context";

export function requireRole(...roles: UserRole[]) {
  return os.$context<AppContext>().middleware(({ context, next }) => {
    if (!context.user || !context.user.isActive) {
      throw new ORPCError("UNAUTHORIZED");
    }
    if (!context.user.roles.some((role) => roles.includes(role))) {
      throw new ORPCError("FORBIDDEN", { data: { reason: "Insufficient role" } });
    }
    return next();
  });
}
