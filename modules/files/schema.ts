import { z } from "zod";

export const FileCategorySchema = z.enum([
  "INSTRUMENT_PHOTO",
  "INSTRUMENT_DOCUMENT",
  "APPLICATION_ATTACHMENT",
  "INSPECTION_EVIDENCE",
  "CERTIFICATE_PDF",
]);
export type FileCategory = z.infer<typeof FileCategorySchema>;

export const CreateUploadIntentInputSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().min(1, "Content type is required"),
  sizeBytes: z.number().int().positive("Size must be positive"),
  category: FileCategorySchema,
  entityId: z.string().min(1, "Target entity ID is required"),
});
export type CreateUploadIntentInput = z.infer<typeof CreateUploadIntentInputSchema>;

export const UploadIntentOutputSchema = z.object({
  uploadUrl: z.string().url(),
  fileId: z.string(),
  expiresAt: z.string(),
  maxSizeBytes: z.number().int(),
});
export type UploadIntentOutput = z.infer<typeof UploadIntentOutputSchema>;

export const ConfirmUploadInputSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  actualSizeBytes: z.number().int().positive(),
  checksum: z.string().optional(),
});
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadInputSchema>;

export const FileMetadataOutputSchema = z.object({
  fileId: z.string(),
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  category: FileCategorySchema,
  uploadedAt: z.string(),
});
export type FileMetadataOutput = z.infer<typeof FileMetadataOutputSchema>;

export const GetDownloadUrlInputSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});
export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlInputSchema>;

export const DownloadUrlOutputSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string(),
  filename: z.string(),
  contentType: z.string(),
});
export type DownloadUrlOutput = z.infer<typeof DownloadUrlOutputSchema>;
