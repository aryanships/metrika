import { implement } from "@orpc/server";
import { notificationsContract } from "../contract";
import { notificationsService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import type { AppContext } from "@/middleware/context";

const implementer = implement(notificationsContract).$context<AppContext>();

export const notificationsRouter = implementer.router({
  listMine: implementer.listMine.use(requireAuth).handler(async ({ input, context }) => {
    return notificationsService.listMine(input, context.user!);
  }),
  markRead: implementer.markRead.use(requireAuth).handler(async ({ input, context }) => {
    return notificationsService.markRead(input, context.user!);
  }),
});
