import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const ApplicationTypeSchema = z.enum([
  "INITIAL_VERIFICATION",
  "RE_VERIFICATION",
  "POST_REPAIR_VERIFICATION",
  "RELOCATION_VERIFICATION",
  "OWNERSHIP_TRANSFER",
  "CERTIFICATE_CORRECTION",
  "DUPLICATE_CERTIFICATE",
]);
export type ApplicationType = z.infer<typeof ApplicationTypeSchema>;

export const ApplicationStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CORRECTION_REQUIRED",
  "APPROVED",
  "SCHEDULED",
  "IN_PROGRESS",
  "PASSED",
  "FAILED",
  "CERTIFICATE_ISSUED",
  "REJECTED",
  "CANCELLED",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationOutputSchema = z.object({
  id: z.string(),
  applicationNumber: z.string(),
  businessId: z.string(),
  instrumentId: z.string(),
  type: ApplicationTypeSchema,
  status: ApplicationStatusSchema,
  preferredDateStart: z.string().nullable().optional(),
  preferredDateEnd: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  reviewedById: z.string().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApplicationOutput = z.infer<typeof ApplicationOutputSchema>;

export const ListApplicationsInputSchema = PaginationInputSchema.extend({
  status: ApplicationStatusSchema.optional(),
  type: ApplicationTypeSchema.optional(),
  instrumentId: z.string().optional(),
  districtId: z.string().optional(),
});
export type ListApplicationsInput = z.infer<typeof ListApplicationsInputSchema>;

export const ListApplicationsOutputSchema = z.object({
  items: z.array(ApplicationOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListApplicationsOutput = z.infer<typeof ListApplicationsOutputSchema>;

export const CreateDraftApplicationInputSchema = z.object({
  instrumentId: z.string().min(1, "Instrument ID is required"),
  type: ApplicationTypeSchema,
  preferredDateStart: z.string().datetime().optional(),
  preferredDateEnd: z.string().datetime().optional(),
});
export type CreateDraftApplicationInput = z.infer<typeof CreateDraftApplicationInputSchema>;

export const UpdateDraftApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  preferredDateStart: z.string().datetime().optional(),
  preferredDateEnd: z.string().datetime().optional(),
});
export type UpdateDraftApplicationInput = z.infer<typeof UpdateDraftApplicationInputSchema>;

export const GetApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
});
export type GetApplicationInput = z.infer<typeof GetApplicationInputSchema>;

export const SubmitApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
});
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationInputSchema>;

export const CancelApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  reason: z.string().min(3, "Cancellation reason is required"),
});
export type CancelApplicationInput = z.infer<typeof CancelApplicationInputSchema>;

export const ReviewActionInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  notes: z.string().optional(),
});
export type ReviewActionInput = z.infer<typeof ReviewActionInputSchema>;

export const RequestCorrectionsInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  reason: z.string().min(5, "Correction reason is required"),
});
export type RequestCorrectionsInput = z.infer<typeof RequestCorrectionsInputSchema>;

export const RejectApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  reason: z.string().min(5, "Rejection reason is required"),
});
export type RejectApplicationInput = z.infer<typeof RejectApplicationInputSchema>;
