import { z } from "zod";

export const InspectionResultSchema = z.enum(["PASS", "FAIL"]);
export type InspectionResult = z.infer<typeof InspectionResultSchema>;

export const ObservationSeveritySchema = z.enum(["INFO", "MINOR", "MAJOR", "NON_COMPLIANCE"]);
export type ObservationSeverity = z.infer<typeof ObservationSeveritySchema>;

// Client submits the standard (reference) and observed (indicated) values; the
// server computes permissible error, observed error, and within-limit from the
// applied regulatory rule so the calculation is never trusted from the client.
export const MeasurementInputSchema = z.object({
  sequence: z.number().int().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  standardValue: z.string().min(1),
  observedValue: z.string().min(1),
});
export type MeasurementInput = z.infer<typeof MeasurementInputSchema>;

export const MeasurementOutputSchema = z.object({
  sequence: z.number().int(),
  code: z.string(),
  label: z.string(),
  unit: z.string().nullable(),
  standardValue: z.string(),
  observedValue: z.string(),
  permissibleError: z.string(),
  observedError: z.string(),
  withinLimit: z.boolean(),
});
export type MeasurementOutput = z.infer<typeof MeasurementOutputSchema>;

export const ResponseInputSchema = z.object({
  templateItemId: z.string().min(1),
  value: z.union([z.boolean(), z.number(), z.string()]),
  isCompliant: z.boolean().optional(),
  remarks: z.string().optional(),
});
export type ResponseInput = z.infer<typeof ResponseInputSchema>;

export const ResponseOutputSchema = z.object({
  id: z.string(),
  templateItemId: z.string(),
  code: z.string(),
  label: z.string(),
  kind: z.string(),
  value: z.unknown(),
  isCompliant: z.boolean().nullable(),
  remarks: z.string().nullable(),
  createdAt: z.string(),
});
export type ResponseOutput = z.infer<typeof ResponseOutputSchema>;

export const ObservationInputSchema = z.object({
  code: z.string().optional(),
  label: z.string().min(1),
  severity: ObservationSeveritySchema.default("INFO"),
  isCompliant: z.boolean().optional(),
  remarks: z.string().min(1),
});
export type ObservationInput = z.infer<typeof ObservationInputSchema>;

export const ObservationOutputSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  label: z.string(),
  severity: ObservationSeveritySchema,
  isCompliant: z.boolean().nullable(),
  remarks: z.string(),
  createdAt: z.string(),
});
export type ObservationOutput = z.infer<typeof ObservationOutputSchema>;

export const InspectionOutputSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  route: z.enum(["LMO", "GATC"]),
  lmoId: z.string().nullable(),
  gatcId: z.string().nullable(),
  performedById: z.string(),
  result: InspectionResultSchema.nullable(),
  templateId: z.string().nullable(),
  ruleVersionId: z.string().nullable(),
  startedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  finalizedAt: z.string().nullable(),
  notes: z.string().nullable(),
  instrument: z.object({
    id: z.string(),
    instrumentCode: z.string(),
    instrumentTypeName: z.string(),
    unit: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    serialNumber: z.string(),
    capacity: z.string().nullable(),
    accuracyClass: z.string().nullable(),
    address: z.string(),
  }),
  application: z.object({
    code: z.string(),
    type: z.string(),
    status: z.string(),
  }),
  appointment: z.object({
    scheduledStartAt: z.string().nullable(),
    scheduledEndAt: z.string().nullable(),
    location: z.string().nullable(),
  }),
  template: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      version: z.number().int(),
      items: z.array(
        z.object({
          id: z.string(),
          code: z.string(),
          label: z.string(),
          kind: z.string(),
          unit: z.string().nullable(),
          isRequired: z.boolean(),
          displayOrder: z.number().int(),
        }),
      ),
    })
    .nullable(),
  rule: z
    .object({
      id: z.string(),
      accuracyClass: z.string(),
      permissibleError: z.string(),
      verificationPeriodMonths: z.number().int(),
    })
    .nullable(),
  measurements: z.array(MeasurementOutputSchema),
  responses: z.array(ResponseOutputSchema),
  observations: z.array(ObservationOutputSchema),
  evidence: z.object({
    required: z.array(z.string()),
    present: z.array(z.string()),
    complete: z.boolean(),
  }),
});
export type InspectionOutput = z.infer<typeof InspectionOutputSchema>;

export const StartInspectionInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});
export type StartInspectionInput = z.infer<typeof StartInspectionInputSchema>;

export const GetInspectionInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});
export type GetInspectionInput = z.infer<typeof GetInspectionInputSchema>;

export const SaveDraftInspectionInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  measurements: z.array(MeasurementInputSchema).optional(),
  responses: z.array(ResponseInputSchema).optional(),
  observations: z.array(ObservationInputSchema).optional(),
  notes: z.string().optional(),
});
export type SaveDraftInspectionInput = z.infer<typeof SaveDraftInspectionInputSchema>;

export const SubmitInspectionInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});
export type SubmitInspectionInput = z.infer<typeof SubmitInspectionInputSchema>;
