import { implement } from "@orpc/server";
import { auditContract } from "../contract";
import { auditService } from "./service";
import { requireRole } from "@/middleware/require-role";
import type { AppContext } from "@/middleware/context";

const implementer = implement(auditContract).$context<AppContext>();

export const auditRouter = implementer.router({
  listEvents: implementer.listEvents.use(requireRole("SYSTEM_ADMIN")).handler(async ({ input }) => {
    return auditService.listEvents(input);
  }),
  getEvent: implementer.getEvent.use(requireRole("SYSTEM_ADMIN")).handler(async ({ input }) => {
    return auditService.getEvent(input);
  }),
});
