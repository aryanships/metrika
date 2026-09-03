import { z } from "zod";

export const InspectionResultSchema = z.enum(["PENDING", "PASSED", "FAILED"]);
export type InspectionResult = z.infer<typeof InspectionResultSchema>;

export const MeasurementEntrySchema = z.object({
  stepNumber: z.number().int().positive(),
  appliedLoad: z.number().nonnegative(),
  indicatedLoad: z.number().nonnegative(),
  observedError: z.number(),
  permissibleError: z.number().positive(),
  withinLimit: z.boolean(),
});
export type MeasurementEntry = z.infer<typeof MeasurementEntrySchema>;

export const InspectionOutputSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  applicationId: z.string(),
  instrumentId: z.string(),
  performerId: z.string(),
  route: z.enum(["LMO", "GATC"]),
  templateId: z.string().nullable().optional(),
  appliedRuleId: z.string().nullable().optional(),
  checklistResponses: z.record(z.string(), z.any()),
  measurements: z.array(MeasurementEntrySchema),
  result: InspectionResultSchema,
  notes: z.string().nullable().optional(),
  finalizedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InspectionOutput = z.infer<typeof InspectionOutputSchema>;

export const StartInspectionInputSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
});
export type StartInspectionInput = z.infer<typeof StartInspectionInputSchema>;

export const GetInspectionInputSchema = z.object({
  id: z.string().min(1, "Inspection ID is required"),
});
export type GetInspectionInput = z.infer<typeof GetInspectionInputSchema>;

export const SaveDraftInspectionInputSchema = z.object({
  id: z.string().min(1, "Inspection ID is required"),
  checklistResponses: z.record(z.string(), z.any()).optional(),
  measurements: z.array(MeasurementEntrySchema).optional(),
  notes: z.string().optional(),
});
export type SaveDraftInspectionInput = z.infer<typeof SaveDraftInspectionInputSchema>;

export const SubmitInspectionInputSchema = z.object({
  id: z.string().min(1, "Inspection ID is required"),
  measurements: z.array(MeasurementEntrySchema).min(1, "At least one measurement required"),
  evidenceFileIds: z.array(z.string()).min(1, "At least one evidence photo required"),
  notes: z.string().optional(),
});
export type SubmitInspectionInput = z.infer<typeof SubmitInspectionInputSchema>;
