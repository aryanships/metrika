import { base } from "@/contracts/base";
import {
  ListCertificatesInputSchema,
  ListCertificatesOutputSchema,
  GetCertificateInputSchema,
  CertificateOutputSchema,
  DownloadCertificatePdfOutputSchema,
} from "./schema";

export const listMineCertificatesContract = base
  .route({
    method: "GET",
    path: "/certificates/mine",
    summary: "List owner's certificates",
    description: "Lists issued certificates belonging to the authenticated owner's instruments.",
    tags: ["Certificates"],
  })
  .input(ListCertificatesInputSchema)
  .output(ListCertificatesOutputSchema);

export const getCertificateContract = base
  .route({
    method: "GET",
    path: "/certificates/{id}",
    summary: "Get certificate details",
    description: "Retrieves full metadata of an official verification certificate.",
    tags: ["Certificates"],
  })
  .input(GetCertificateInputSchema)
  .output(CertificateOutputSchema);

export const downloadPdfContract = base
  .route({
    method: "GET",
    path: "/certificates/{id}/download-pdf",
    summary: "Download prototype certificate PDF",
    description: "Generates or retrieves a secure download URL for the prototype verification certificate PDF.",
    tags: ["Certificates"],
  })
  .input(GetCertificateInputSchema)
  .output(DownloadCertificatePdfOutputSchema);

export const certificatesContract = {
  listMine: listMineCertificatesContract,
  get: getCertificateContract,
  downloadPdf: downloadPdfContract,
};
