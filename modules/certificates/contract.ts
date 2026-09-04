import { base } from "@/contracts/base";
import {
  ListCertificatesInputSchema,
  ListCertificatesOutputSchema,
  GetCertificateInputSchema,
  CertificateOutputSchema,
  IssueCertificateInputSchema,
  UpdateCertificateStatusInputSchema,
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
    description: "Retrieves full metadata of an official verification certificate for an authorized viewer.",
    tags: ["Certificates"],
  })
  .input(GetCertificateInputSchema)
  .output(CertificateOutputSchema);

export const issueCertificateContract = base
  .route({
    method: "POST",
    path: "/certificates/issue",
    successStatus: 201,
    summary: "Issue a certificate",
    description: "Issues one certificate for a passed application: hashes the canonical payload, supersedes prior active certificates, and notifies the owner.",
    tags: ["Certificates"],
  })
  .input(IssueCertificateInputSchema)
  .output(CertificateOutputSchema);

export const updateCertificateStatusContract = base
  .route({
    method: "PATCH",
    path: "/certificates/{id}/status",
    summary: "Update certificate status",
    description: "Authorized, audited status change (suspend/cancel/revoke/supersede) with a required reason.",
    tags: ["Certificates"],
  })
  .input(UpdateCertificateStatusInputSchema)
  .output(CertificateOutputSchema);

export const certificatesContract = {
  listMine: listMineCertificatesContract,
  get: getCertificateContract,
  issue: issueCertificateContract,
  updateStatus: updateCertificateStatusContract,
};
