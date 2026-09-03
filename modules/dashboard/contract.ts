import { base } from "@/contracts/base";
import {
  GetDashboardStatsInputSchema,
  DashboardStatsOutputSchema,
} from "./schema";

export const getStatsContract = base
  .route({
    method: "GET",
    path: "/dashboard/stats",
    summary: "Get role-scoped dashboard stats",
    description: "Returns aggregated metrics and counts scoped to the authenticated user's role and jurisdiction.",
    tags: ["Dashboard"],
  })
  .input(GetDashboardStatsInputSchema)
  .output(DashboardStatsOutputSchema);

export const dashboardContract = {
  getStats: getStatsContract,
};
