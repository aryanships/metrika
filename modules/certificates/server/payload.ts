import { createHash } from "node:crypto";

/**
 * Canonical certificate payload (9.1). A deterministic, versioned, ordered
 * serialization of the fields that appear on a certificate. Hashing this exact
 * string is the prototype's tamper-evidence mechanism (9.2) — not a government
 * digital signature.
 */

export const PAYLOAD_VERSION = 1;

export interface CanonicalCertificateFields {
  certificateCode: string;
  applicationCode: string;
  instrumentCode: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentTypeName: string;
  capacity: string | null;
  accuracyClass: string | null;
  businessName: string;
  result: "PASS";
  ruleReference: string;
  verifiedAt: string;
  validUntil: string;
  issuingAuthority: string;
}

/**
 * Ordered keys + JSON.stringify are stable across runs, so the same certificate
 * data always produces the same hash. Keep key order stable: reordering breaks
 * existing hashes.
 */
export function buildCanonicalPayload(fields: CanonicalCertificateFields): string {
  const ordered = {
    v: PAYLOAD_VERSION,
    certificateCode: fields.certificateCode,
    applicationCode: fields.applicationCode,
    instrumentCode: fields.instrumentCode,
    manufacturer: fields.manufacturer,
    model: fields.model,
    serialNumber: fields.serialNumber,
    instrumentTypeName: fields.instrumentTypeName,
    capacity: fields.capacity,
    accuracyClass: fields.accuracyClass,
    businessName: fields.businessName,
    result: fields.result,
    ruleReference: fields.ruleReference,
    verifiedAt: fields.verifiedAt,
    validUntil: fields.validUntil,
    issuingAuthority: fields.issuingAuthority,
  };
  return JSON.stringify(ordered);
}

export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function hashCanonical(fields: CanonicalCertificateFields): string {
  return hashPayload(buildCanonicalPayload(fields));
}
