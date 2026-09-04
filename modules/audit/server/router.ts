import { implement } from "@orpc/server";
import { auditContract } from "../contract";
import { auditService } from "./service";
import { requireRole } from "@/middleware/require-role";
import type { AppContext } from "@/middleware/context";

const implementer = implement(auditContract).$context<AppContext>();

const ADMIN_ROLES = ["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"] as const;

export const auditRouter = implementer.router({
  listEvents: implementer.listEvents.use(requireRole(...ADMIN_ROLES)).handler(async ({ input }) => {
    return auditService.listEvents(input);
  }),
  getEvent: implementer.getEvent.use(requireRole(...ADMIN_ROLES)).handler(async ({ input }) => {
    return auditService.getEvent(input);
  }),
});
