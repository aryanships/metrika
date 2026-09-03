import { dashboardRepository } from "./repository";
import { GetDashboardStatsInput, DashboardStatsOutput } from "../schema";

export const dashboardService = {
  async getStats(
    input: GetDashboardStatsInput,
    userRole = "INSTRUMENT_OWNER",
    scopeId?: string
  ): Promise<DashboardStatsOutput> {
    const stats = await dashboardRepository.aggregateRoleStats(userRole, scopeId);

    return {
      role: userRole,
      stats,
      recentActivity: [
        {
          id: "act_1",
          title: "Certificate CERT-DL-2024-0042 verified successfully",
          timestamp: new Date().toISOString(),
          type: "CERTIFICATE",
        },
        {
          id: "act_2",
          title: "Application APP-DL-2024-0012 approved by State Admin",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: "APPLICATION",
        },
      ],
    };
  },
};
