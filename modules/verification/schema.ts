import { z } from "zod";

export const VerifyCertificateInputSchema = z.object({
  certificateCode: z.string().min(1, "Certificate code is required"),
});
export type VerifyCertificateInput = z.infer<typeof VerifyCertificateInputSchema>;

export const PublicVerificationOutputSchema = z.object({
  valid: z.boolean(),
  certificateCode: z.string(),
  status: z.string(),
  issuedAt: z.string(),
  validUntil: z.string(),
  issuingAuthority: z.string(),
  instrument: z.object({
    code: z.string(),
    category: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    serialNumber: z.string(),
    accuracyClass: z.string(),
    capacity: z.number(),
  }),
  integrity: z.object({
    isHashVerified: z.boolean(),
    tamperDetected: z.boolean(),
  }),
  verificationTimestamp: z.string(),
});
export type PublicVerificationOutput = z.infer<typeof PublicVerificationOutputSchema>;
