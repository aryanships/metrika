import { implement } from "@orpc/server";
import { notificationsContract } from "../contract";
import { notificationsService } from "./service";

const implementer = implement(notificationsContract);

export const notificationsRouter = implementer.router({
  listMine: implementer.listMine.handler(async ({ input, context }: any) => {
    return notificationsService.listMine(input, context?.user?.id ?? "usr_demo");
  }),
  markRead: implementer.markRead.handler(async ({ input, context }: any) => {
    return notificationsService.markRead(input, context?.user?.id ?? "usr_demo");
  }),
});
