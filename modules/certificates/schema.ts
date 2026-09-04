import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const CertificateStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
  "REVOKED",
  "SUPERSEDED",
]);
export type CertificateStatus = z.infer<typeof CertificateStatusSchema>;

export const CertificateInstrumentSchema = z.object({
  code: z.string(),
  typeName: z.string(),
  unit: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  capacity: z.string().nullable(),
  accuracyClass: z.string().nullable(),
});

export const CertificateOutputSchema = z.object({
  id: z.string(),
  certificateCode: z.string(),
  applicationId: z.string(),
  instrumentId: z.string(),
  verifiedAt: z.string(),
  validUntil: z.string(),
  status: CertificateStatusSchema,
  issuingAuthority: z.string(),
  payloadHash: z.string(),
  ruleVersionId: z.string().nullable(),
  fileId: z.string().nullable(),
  qrUrl: z.string(),
  createdAt: z.string(),
  instrument: CertificateInstrumentSchema,
  businessName: z.string(),
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

export const IssueCertificateInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});
export type IssueCertificateInput = z.infer<typeof IssueCertificateInputSchema>;

export const UpdateCertificateStatusInputSchema = z.object({
  id: z.string().min(1, "Certificate ID is required"),
  status: z.enum(["SUSPENDED", "CANCELLED", "REVOKED", "SUPERSEDED"]),
  reason: z.string().min(1, "A reason is required for this status change"),
});
export type UpdateCertificateStatusInput = z.infer<typeof UpdateCertificateStatusInputSchema>;
