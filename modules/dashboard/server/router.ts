import { implement } from "@orpc/server";
import { dashboardContract } from "../contract";
import { dashboardService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import type { AppContext } from "@/middleware/context";

const implementer = implement(dashboardContract).$context<AppContext>();

export const dashboardRouter = implementer.router({
  getStats: implementer.getStats.use(requireAuth).handler(async ({ context }) => {
    return dashboardService.getStats(context.user!);
  }),
});
