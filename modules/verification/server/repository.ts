/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `verification` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/verification/server/service.ts` or procedures.
 */

export interface VerificationLogRecord {
  id: string;
  certificateCode: string;
  matched: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: Date;
}

export const verificationRepository = {
  async logVerification(data: Omit<VerificationLogRecord, "id" | "timestamp">): Promise<void> {
    // Phase 0 placeholder. Phase 1/2 writes CertificateVerification model.
  },
};
