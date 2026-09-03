import { implement } from "@orpc/server";
import { dashboardContract } from "../contract";
import { dashboardService } from "./service";

const implementer = implement(dashboardContract);

export const dashboardRouter = implementer.router({
  getStats: implementer.getStats.handler(async ({ input, context }: any) => {
    return dashboardService.getStats(
      input,
      context?.user?.role ?? "INSTRUMENT_OWNER",
      context?.user?.stateId ?? undefined
    );
  }),
});
