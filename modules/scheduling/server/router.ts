import { implement } from "@orpc/server";
import { schedulingContract } from "../contract";
import { schedulingService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(schedulingContract).$context<AppContext>();

const OPERATIONAL_ADMIN = ["STATE_ADMIN", "DISTRICT_ADMIN"] as const;

export const schedulingRouter = implementer.router({
  recommend: implementer.recommend
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      return schedulingService.recommend(input, context.user!);
    }),

  assign: implementer.assign
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const result = await schedulingService.assign(input, context.user!);
      await auditAction(context, "APPLICATION_ASSIGNED", "Application", result.applicationId, {
        workOrder: result,
        overrideReason: input.overrideReason ?? null,
      });
      return result;
    }),

  schedule: implementer.schedule
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const result = await schedulingService.schedule(input, context.user!);
      await auditAction(context, "APPLICATION_SCHEDULED", "Application", result.applicationId, result);
      return result;
    }),

  listWorkOrders: implementer.listWorkOrders
    .use(requireAuth)
    .handler(async ({ input, context }) => {
      return schedulingService.listWorkOrders(input, context.user!);
    }),
});
