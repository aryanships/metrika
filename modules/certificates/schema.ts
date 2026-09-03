import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const CertificateStatusSchema = z.enum(["ACTIVE", "EXPIRING_SOON", "EXPIRED", "REVOKED", "SUPERSEDED"]);
export type CertificateStatus = z.infer<typeof CertificateStatusSchema>;

export const CertificateOutputSchema = z.object({
  id: z.string(),
  certificateCode: z.string(),
  applicationId: z.string(),
  instrumentId: z.string(),
  issuedAt: z.string(),
  validFrom: z.string(),
  validUntil: z.string(),
  status: CertificateStatusSchema,
  issuingAuthority: z.string(),
  payloadHash: z.string(),
  fileId: z.string().nullable().optional(),
  qrUrl: z.string(),
  createdAt: z.string(),
});
export type CertificateOutput = z.infer<typeof CertificateOutputSchema>;

export const ListCertificatesInputSchema = PaginationInputSchema.extend({
  status: CertificateStatusSchema.optional(),
  instrumentId: z.string().optional(),
});
export type ListCertificatesInput = z.infer<typeof ListCertificatesInputSchema>;

export const ListCertificatesOutputSchema = z.object({
  items: z.array(CertificateOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListCertificatesOutput = z.infer<typeof ListCertificatesOutputSchema>;

export const GetCertificateInputSchema = z.object({
  id: z.string().min(1, "Certificate ID or code is required"),
});
export type GetCertificateInput = z.infer<typeof GetCertificateInputSchema>;

export const DownloadCertificatePdfOutputSchema = z.object({
  downloadUrl: z.string().url(),
  filename: z.string(),
  expiresAt: z.string(),
});
export type DownloadCertificatePdfOutput = z.infer<typeof DownloadCertificatePdfOutputSchema>;
