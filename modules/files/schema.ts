import { z } from "zod";

// Mirrors the `AttachmentKind` enum in the data contract.
export const AttachmentKindSchema = z.enum([
  "PREVIOUS_CERTIFICATE",
  "PURCHASE_DOCUMENT",
  "APPROVAL_DOCUMENT",
  "INSTRUMENT_FRONT",
  "SERIAL_NUMBER",
  "NAMEPLATE",
  "CONDITION",
  "VERIFICATION_AREA",
  "TEST_SETUP",
  "INSPECTION_VIDEO",
  "INSPECTION_REPORT",
  "CERTIFICATE_CORRECTION_EVIDENCE",
  "OTHER",
]);
export type AttachmentKind = z.infer<typeof AttachmentKindSchema>;

export const AttachmentTargetTypeSchema = z.enum(["instrument", "application", "inspection"]);
export type AttachmentTargetType = z.infer<typeof AttachmentTargetTypeSchema>;

export const AttachmentTargetSchema = z
  .object({
    instrumentId: z.string().min(1).optional(),
    applicationId: z.string().min(1).optional(),
    inspectionId: z.string().min(1).optional(),
  })
  .refine(
    (t) => [t.instrumentId, t.applicationId, t.inspectionId].filter(Boolean).length === 1,
    { message: "Exactly one of instrumentId, applicationId, or inspectionId is required" },
  );
export type AttachmentTarget = z.infer<typeof AttachmentTargetSchema>;

export const CreateUploadIntentInputSchema = z.object({
  kind: AttachmentKindSchema,
  target: AttachmentTargetSchema,
  fileName: z.string().min(1, "Filename is required"),
  contentType: z.string().min(1, "Content type is required"),
  sizeBytes: z.number().int().positive("Size must be positive"),
  capturedAt: z.string().datetime().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
export type CreateUploadIntentInput = z.infer<typeof CreateUploadIntentInputSchema>;

export const UploadIntentOutputSchema = z.object({
  uploadUrl: z.string().url(),
  uploadToken: z.string(),
  expiresAt: z.string(),
  maxSizeBytes: z.number().int(),
});
export type UploadIntentOutput = z.infer<typeof UploadIntentOutputSchema>;

export const ConfirmUploadInputSchema = z.object({
  uploadToken: z.string().min(1, "Upload token is required"),
});
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadInputSchema>;

export const AttachmentOutputSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  kind: AttachmentKindSchema,
  instrumentId: z.string().nullable(),
  applicationId: z.string().nullable(),
  inspectionId: z.string().nullable(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  capturedAt: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  createdAt: z.string(),
});
export type AttachmentOutput = z.infer<typeof AttachmentOutputSchema>;

export const GetDownloadUrlInputSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});
export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlInputSchema>;

export const DownloadUrlOutputSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string(),
  fileName: z.string(),
  contentType: z.string(),
});
export type DownloadUrlOutput = z.infer<typeof DownloadUrlOutputSchema>;
