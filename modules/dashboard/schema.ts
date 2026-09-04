import { z } from "zod";

export const GetDashboardStatsInputSchema = z.object({}).optional();
export type GetDashboardStatsInput = z.infer<typeof GetDashboardStatsInputSchema>;

const AppointmentSummarySchema = z.object({
  applicationCode: z.string(),
  instrumentCode: z.string(),
  scheduledStartAt: z.string().nullable(),
  scheduledEndAt: z.string().nullable(),
});

const FieldWorkOrderSchema = z.object({
  applicationId: z.string(),
  applicationCode: z.string(),
  instrumentCode: z.string(),
  instrumentType: z.string(),
  scheduledStartAt: z.string().nullable(),
  scheduledEndAt: z.string().nullable(),
  location: z.string().nullable(),
  status: z.string(),
});

export const DashboardStatsOutputSchema = z.object({
  role: z.string(),
  owner: z
    .object({
      instrumentsByStatus: z.record(z.string(), z.number().int()),
      certificatesByStatus: z.record(z.string(), z.number().int()),
      applicationsByStatus: z.record(z.string(), z.number().int()),
      upcomingAppointments: z.array(AppointmentSummarySchema),
    })
    .nullable(),
  admin: z
    .object({
      applicationsByStatus: z.record(z.string(), z.number().int()),
      certificatesByStatus: z.record(z.string(), z.number().int()),
      applicationsByDistrict: z.array(z.object({ district: z.string(), count: z.number().int() })),
      lmoWorkload: z.array(z.object({ name: z.string(), open: z.number().int() })),
      gatcWorkload: z.array(z.object({ name: z.string(), open: z.number().int() })),
    })
    .nullable(),
  field: z
    .object({
      assigned: z.number().int(),
      today: z.number().int(),
      pending: z.number().int(),
      workOrders: z.array(FieldWorkOrderSchema),
    })
    .nullable(),
});
export type DashboardStatsOutput = z.infer<typeof DashboardStatsOutputSchema>;
