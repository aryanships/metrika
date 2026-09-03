import { certificatesRepository, CertificateRecord } from "./repository";
import {
  ListCertificatesInput,
  ListCertificatesOutput,
  GetCertificateInput,
  CertificateOutput,
  DownloadCertificatePdfOutput,
} from "../schema";

function toSafeCertificateOutput(rec: CertificateRecord): CertificateOutput {
  return {
    id: rec.id,
    certificateCode: rec.certificateCode,
    applicationId: rec.applicationId,
    instrumentId: rec.instrumentId,
    issuedAt: rec.issuedAt.toISOString(),
    validFrom: rec.validFrom.toISOString(),
    validUntil: rec.validUntil.toISOString(),
    status: rec.status,
    issuingAuthority: rec.issuingAuthority,
    payloadHash: rec.payloadHash,
    fileId: rec.fileId ?? null,
    qrUrl: rec.qrUrl,
    createdAt: rec.createdAt.toISOString(),
  };
}

export const certificatesService = {
  async listMine(
    input: ListCertificatesInput,
    ownerId = "usr_demo"
  ): Promise<ListCertificatesOutput> {
    const mock: CertificateRecord = {
      id: "cert_demo_1",
      certificateCode: "CERT-DL-2024-0042",
      applicationId: "app_demo_1",
      instrumentId: "inst_demo_1",
      issuedAt: new Date("2024-01-10"),
      validFrom: new Date("2024-01-10"),
      validUntil: new Date("2025-01-09"),
      status: "ACTIVE",
      issuingAuthority: "Legal Metrology Department, Delhi",
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      fileId: "file_cert_pdf_1",
      qrUrl: "/verify/c/CERT-DL-2024-0042",
      createdAt: new Date(),
    };

    return {
      items: [toSafeCertificateOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async get(input: GetCertificateInput): Promise<CertificateOutput> {
    const mock: CertificateRecord = {
      id: input.id,
      certificateCode: "CERT-DL-2024-0042",
      applicationId: "app_demo_1",
      instrumentId: "inst_demo_1",
      issuedAt: new Date("2024-01-10"),
      validFrom: new Date("2024-01-10"),
      validUntil: new Date("2025-01-09"),
      status: "ACTIVE",
      issuingAuthority: "Legal Metrology Department, Delhi",
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      fileId: "file_cert_pdf_1",
      qrUrl: "/verify/c/CERT-DL-2024-0042",
      createdAt: new Date(),
    };
    return toSafeCertificateOutput(mock);
  },

  async downloadPdf(input: GetCertificateInput): Promise<DownloadCertificatePdfOutput> {
    return {
      downloadUrl: `https://storage.metrology.example.com/certificates/${input.id}/download`,
      filename: `Certificate_${input.id}.pdf`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  },
};
