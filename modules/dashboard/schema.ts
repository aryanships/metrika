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

const SystemStatsSchema = z.object({
  users: z.number().int(),
  businesses: z.number().int(),
  instruments: z.number().int(),
  applications: z.number().int(),
  certificates: z.number().int(),
  auditEvents: z.number().int(),
  states: z.number().int(),
  districts: z.number().int(),
  tehsils: z.number().int(),
  villages: z.number().int(),
  instrumentTypes: z.number().int(),
  regulatoryRules: z.number().int(),
  inspectionTemplates: z.number().int(),
  lmos: z.number().int(),
  gatcs: z.number().int(),
  admins: z.number().int(),
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
  system: SystemStatsSchema.nullable(),
});
export type DashboardStatsOutput = z.infer<typeof DashboardStatsOutputSchema>;
