import { implement } from "@orpc/server";
import { auditContract } from "../contract";
import { auditService } from "./service";

const implementer = implement(auditContract);

export const auditRouter = implementer.router({
  listEvents: implementer.listEvents.handler(async ({ input }) => {
    return auditService.listEvents(input);
  }),
  getEvent: implementer.getEvent.handler(async ({ input }) => {
    return auditService.getEvent(input);
  }),
});
