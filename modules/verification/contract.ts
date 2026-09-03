import { base } from "@/contracts/base";
import {
  VerifyCertificateInputSchema,
  PublicVerificationOutputSchema,
} from "./schema";

export const verifyCertificateContract = base
  .route({
    method: "GET",
    path: "/verification/verify/{certificateCode}",
    summary: "Public certificate verification",
    description: "Public unauthenticated endpoint to verify authenticity, validity, and integrity of a verification certificate.",
    tags: ["Verification"],
  })
  .input(VerifyCertificateInputSchema)
  .output(PublicVerificationOutputSchema);

export const verificationContract = {
  verifyCertificate: verifyCertificateContract,
};
