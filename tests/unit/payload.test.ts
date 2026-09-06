import { describe, test, expect } from "bun:test";
import { buildCanonicalPayload, hashCanonical, hashPayload } from "../../modules/certificates/server/payload";

const fields = {
  certificateCode: "CERT-2026-0001",
  applicationCode: "APP-2026-0001",
  instrumentCode: "DMI-EWB-001",
  manufacturer: "Mettler Toledo",
  model: "bPlus-T",
  serialNumber: "MT-2024-001",
  instrumentTypeName: "Electronic Weighing Balance",
  capacity: "15.0",
  accuracyClass: "Class III",
  businessName: "Reliance Fresh Superstores",
  result: "PASS" as const,
  ruleReference: "rule-123",
  verifiedAt: "2026-05-10T10:00:00.000Z",
  validUntil: "2027-05-09T23:59:59.000Z",
  issuingAuthority: "Legal Metrology Department, Maharashtra",
};

describe("buildCanonicalPayload", () => {
  test("is deterministic across calls", () => {
    expect(buildCanonicalPayload(fields)).toBe(buildCanonicalPayload(fields));
  });

  test("is stable across key insertion order", () => {
    // Rebuilding the object with a different key order must not change the payload.
    const reordered = {
      issuingAuthority: fields.issuingAuthority,
      certificateCode: fields.certificateCode,
      validUntil: fields.validUntil,
      verifiedAt: fields.verifiedAt,
      ruleReference: fields.ruleReference,
      result: fields.result,
      businessName: fields.businessName,
      accuracyClass: fields.accuracyClass,
      capacity: fields.capacity,
      instrumentTypeName: fields.instrumentTypeName,
      serialNumber: fields.serialNumber,
      model: fields.model,
      manufacturer: fields.manufacturer,
      instrumentCode: fields.instrumentCode,
      applicationCode: fields.applicationCode,
    };
    expect(buildCanonicalPayload(reordered)).toBe(buildCanonicalPayload(fields));
  });

  test("is sensitive to every field", () => {
    const base = buildCanonicalPayload(fields);
    expect(buildCanonicalPayload({ ...fields, serialNumber: "MT-2024-999" })).not.toBe(base);
    expect(buildCanonicalPayload({ ...fields, capacity: "30.0" })).not.toBe(base);
    expect(buildCanonicalPayload({ ...fields, businessName: "Other Co" })).not.toBe(base);
  });
});

describe("hashPayload / hashCanonical", () => {
  test("produces a 64-char hex digest", () => {
    const hash = hashPayload(buildCanonicalPayload(fields));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("hashCanonical matches hashPayload(buildCanonicalPayload(...))", () => {
    expect(hashCanonical(fields)).toBe(hashPayload(buildCanonicalPayload(fields)));
  });

  test("different fields produce different hashes", () => {
    expect(hashCanonical(fields)).not.toBe(hashCanonical({ ...fields, model: "other" }));
  });
});
