import { z } from "zod";

export const GetDashboardStatsInputSchema = z.object({}).optional();
export type GetDashboardStatsInput = z.infer<typeof GetDashboardStatsInputSchema>;

export const DashboardStatsOutputSchema = z.object({
  role: z.string(),
  stats: z.object({
    totalInstruments: z.number().int(),
    activeCertificates: z.number().int(),
    expiringCertificates: z.number().int(),
    expiredCertificates: z.number().int(),
    pendingApplications: z.number().int(),
    scheduledInspections: z.number().int(),
    completedInspections: z.number().int(),
  }),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      timestamp: z.string(),
      type: z.string(),
    })
  ),
});
export type DashboardStatsOutput = z.infer<typeof DashboardStatsOutputSchema>;
