import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const ApplicationTypeSchema = z.enum([
  "INITIAL_VERIFICATION",
  "RE_VERIFICATION",
  "POST_REPAIR_VERIFICATION",
  "RELOCATION_RE_VERIFICATION",
  "OWNERSHIP_TRANSFER",
  "CERTIFICATE_CORRECTION",
  "DUPLICATE_CERTIFICATE",
]);
export type ApplicationType = z.infer<typeof ApplicationTypeSchema>;

export const ApplicationStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "DOCUMENTS_REQUIRED",
  "APPROVED",
  "SCHEDULED",
  "VERIFICATION_IN_PROGRESS",
  "PASSED",
  "FAILED",
  "CERTIFICATE_GENERATED",
  "REJECTED",
  "CANCELLED",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const VerificationRouteSchema = z.enum(["LMO", "GATC"]);
export type VerificationRoute = z.infer<typeof VerificationRouteSchema>;

export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const RequestedChangesSchema = z.record(z.string(), z.unknown());

export const ApplicationOutputSchema = z.object({
  id: z.string(),
  applicationCode: z.string(),
  instrumentId: z.string(),
  instrumentCode: z.string(),
  type: ApplicationTypeSchema,
  status: ApplicationStatusSchema,
  route: VerificationRouteSchema.nullable(),
  priority: PrioritySchema,
  targetCertificateId: z.string().nullable(),
  preferredStartAt: z.string().nullable(),
  preferredEndAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApplicationOutput = z.infer<typeof ApplicationOutputSchema>;

export const ListApplicationsInputSchema = PaginationInputSchema.extend({
  status: ApplicationStatusSchema.optional(),
  type: ApplicationTypeSchema.optional(),
  instrumentId: z.string().optional(),
});
export type ListApplicationsInput = z.infer<typeof ListApplicationsInputSchema>;

export const ListApplicationsOutputSchema = z.object({
  items: z.array(ApplicationOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListApplicationsOutput = z.infer<typeof ListApplicationsOutputSchema>;

export const ListQueueInputSchema = PaginationInputSchema.extend({
  status: ApplicationStatusSchema.optional(),
  type: ApplicationTypeSchema.optional(),
  priority: PrioritySchema.optional(),
  districtId: z.string().optional(),
});
export type ListQueueInput = z.infer<typeof ListQueueInputSchema>;

export const CreateDraftApplicationInputSchema = z.object({
  instrumentId: z.string().min(1, "Instrument ID is required"),
  type: ApplicationTypeSchema,
  targetCertificateId: z.string().optional(),
  requestedChanges: RequestedChangesSchema.optional(),
  preferredStartAt: z.string().datetime().optional(),
  preferredEndAt: z.string().datetime().optional(),
});
export type CreateDraftApplicationInput = z.infer<typeof CreateDraftApplicationInputSchema>;

export const UpdateDraftApplicationInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  preferredStartAt: z.string().datetime().optional(),
  preferredEndAt: z.string().datetime().optional(),
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

export const SetPriorityInputSchema = z.object({
  id: z.string().min(1, "Application ID is required"),
  priority: PrioritySchema,
});
export type SetPriorityInput = z.infer<typeof SetPriorityInputSchema>;

export const CompletenessCheckSchema = z.object({
  label: z.string(),
  passed: z.boolean(),
});
export type CompletenessCheck = z.infer<typeof CompletenessCheckSchema>;

export const CompletenessOutputSchema = z.object({
  complete: z.boolean(),
  checks: z.array(CompletenessCheckSchema),
});
export type CompletenessOutput = z.infer<typeof CompletenessOutputSchema>;

export const ApplicationStatusHistoryOutputSchema = z.object({
  id: z.string(),
  fromStatus: ApplicationStatusSchema.nullable(),
  toStatus: ApplicationStatusSchema,
  reason: z.string().nullable(),
  changedById: z.string().nullable(),
  createdAt: z.string(),
});
export type ApplicationStatusHistoryOutput = z.infer<typeof ApplicationStatusHistoryOutputSchema>;

export const ApplicationInstrumentSchema = z.object({
  id: z.string(),
  instrumentCode: z.string(),
  instrumentTypeName: z.string(),
  instrumentTypeUnit: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  capacity: z.string().nullable(),
  accuracyClass: z.string().nullable(),
  status: z.string(),
  address: z.string(),
  administrativeUnitName: z.string(),
});
export type ApplicationInstrument = z.infer<typeof ApplicationInstrumentSchema>;

export const ApplicationDetailOutputSchema = z.object({
  application: ApplicationOutputSchema,
  instrument: ApplicationInstrumentSchema,
  businessName: z.string(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  appointment: z.object({
    scheduledStartAt: z.string().nullable(),
    scheduledEndAt: z.string().nullable(),
    location: z.string().nullable(),
  }),
  priorCertificates: z.array(
    z.object({
      id: z.string(),
      certificateCode: z.string(),
      verifiedAt: z.string(),
      validUntil: z.string(),
      status: z.string(),
    }),
  ),
  statusHistory: z.array(ApplicationStatusHistoryOutputSchema),
  completeness: CompletenessOutputSchema,
});
export type ApplicationDetailOutput = z.infer<typeof ApplicationDetailOutputSchema>;
