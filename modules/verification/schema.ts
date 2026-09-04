import { z } from "zod";

export const VerifyCertificateInputSchema = z.object({
  certificateCode: z.string().min(1, "Certificate code or instrument code is required"),
});
export type VerifyCertificateInput = z.infer<typeof VerifyCertificateInputSchema>;

// SECURITY: strictly safe public payload — no owner phone, email, address, or documents.
export const PublicVerificationOutputSchema = z.object({
  valid: z.boolean(),
  certificateCode: z.string(),
  status: z.string(),
  verifiedAt: z.string(),
  validUntil: z.string(),
  issuingAuthority: z.string(),
  instrument: z.object({
    code: z.string(),
    category: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    serialNumber: z.string(),
    accuracyClass: z.string().nullable(),
    capacity: z.string().nullable(),
    capacityUnit: z.string().nullable(),
  }),
  integrity: z.object({
    isHashVerified: z.boolean(),
    tamperDetected: z.boolean(),
  }),
  verificationTimestamp: z.string(),
});
export type PublicVerificationOutput = z.infer<typeof PublicVerificationOutputSchema>;
