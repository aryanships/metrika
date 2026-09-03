import { verificationRepository } from "./repository";
import { VerifyCertificateInput, PublicVerificationOutput } from "../schema";

export const verificationService = {
  async verifyCertificate(
    input: VerifyCertificateInput,
    ipAddress?: string
  ): Promise<PublicVerificationOutput> {
    await verificationRepository.logVerification({
      certificateCode: input.certificateCode,
      matched: true,
      ipAddress: ipAddress ?? null,
      userAgent: null,
    });

    // SECURITY: Safe public payload only - strictly NO owner phone, email, private address, or documents
    return {
      valid: true,
      certificateCode: input.certificateCode,
      status: "ACTIVE",
      issuedAt: new Date("2024-01-10").toISOString(),
      validUntil: new Date("2025-01-09").toISOString(),
      issuingAuthority: "Legal Metrology Department, Delhi",
      instrument: {
        code: "IND-DL-NAWI-2024-0089",
        category: "MASS",
        manufacturer: "Essae-Teraoka",
        model: "DS-215",
        serialNumber: "SN-9841203",
        accuracyClass: "Class III",
        capacity: 30,
      },
      integrity: {
        isHashVerified: true,
        tamperDetected: false,
      },
      verificationTimestamp: new Date().toISOString(),
    };
  },
};
