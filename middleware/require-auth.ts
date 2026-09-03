import { ORPCError, os } from "@orpc/server";
import type { AppContext } from "./context";

export const requireAuth = os.$context<AppContext>().middleware(({ context, next }) => {
  if (!context.user || !context.user.isActive) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next();
});
