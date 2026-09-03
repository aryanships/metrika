/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `certificates` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/certificates/server/service.ts` or procedures.
 */

export interface CertificateRecord {
  id: string;
  certificateCode: string;
  applicationId: string;
  instrumentId: string;
  issuedAt: Date;
  validFrom: Date;
  validUntil: Date;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED" | "SUPERSEDED";
  issuingAuthority: string;
  payloadHash: string;
  fileId?: string | null;
  qrUrl: string;
  createdAt: Date;
}

export const certificatesRepository = {
  async findById(id: string): Promise<CertificateRecord | null> {
    return null;
  },

  async findByCode(code: string): Promise<CertificateRecord | null> {
    return null;
  },

  async create(data: Omit<CertificateRecord, "id" | "createdAt">): Promise<CertificateRecord> {
    return {
      id: `cert_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },
};
