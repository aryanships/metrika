import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { buildCanonicalPayload, hashPayload } from "@/modules/certificates/server/payload";
import type { VerifyCertificateInput, PublicVerificationOutput } from "../schema";

type Orm = typeof db.orm.public;
type CertificateRow = NonNullable<Awaited<ReturnType<Orm["Certificate"]["first"]>>>;

async function issuingAuthorityFor(unitId: string): Promise<string> {
  let unit = await db.orm.public.AdministrativeUnit.first({ id: unitId });
  while (unit && unit.type !== "STATE") {
    unit = unit.parentId ? await db.orm.public.AdministrativeUnit.first({ id: unit.parentId }) : null;
  }
  return unit ? `Legal Metrology Department, ${unit.name}` : "Legal Metrology Department";
}

async function findCertificate(query: string): Promise<CertificateRow | null> {
  const byCode = await db.orm.public.Certificate.where({ certificateCode: query }).first();
  if (byCode) return byCode;

  const instrument = await db.orm.public.Instrument.where({ instrumentCode: query }).first();
  if (!instrument) return null;
  return db.orm.public.Certificate.where({ instrumentId: instrument.id })
    .orderBy((c) => c.verifiedAt.desc())
    .first();
}

export const verificationService = {
  async verifyCertificate(
    input: VerifyCertificateInput,
    ipAddress?: string,
  ): Promise<PublicVerificationOutput> {
    const certificate = await findCertificate(input.certificateCode.trim());
    if (!certificate) {
      throw new ORPCError("NOT_FOUND", { data: { resourceType: "Certificate", resourceId: input.certificateCode } });
    }

    const instrument = await db.orm.public.Instrument.first({ id: certificate.instrumentId });
    const type = instrument
      ? await db.orm.public.InstrumentType.first({ id: instrument.instrumentTypeId })
      : null;
    const issuingAuthority = instrument
      ? await issuingAuthorityFor(instrument.administrativeUnitId)
      : "Legal Metrology Department";

    const now = Date.now();
    const active = certificate.status === "ACTIVE" || certificate.status === "EXPIRING_SOON";
    const valid = active && Date.parse(certificate.validUntil) > now;

    // Recompute the canonical payload hash from live fields to detect tampering
    // (best-effort prototype integrity, not a qualified signature).
    const [application, business, rule] = await Promise.all([
      db.orm.public.Application.first({ id: certificate.applicationId }),
      instrument ? db.orm.public.Business.first({ id: instrument.businessId }) : Promise.resolve(null),
      certificate.ruleVersionId
        ? db.orm.public.RegulatoryRule.first({ id: certificate.ruleVersionId })
        : Promise.resolve(null),
    ]);
    const recomputedHash = hashPayload(
      buildCanonicalPayload({
        certificateCode: certificate.certificateCode,
        applicationCode: application?.applicationCode ?? "",
        instrumentCode: instrument?.instrumentCode ?? "",
        manufacturer: instrument?.manufacturer ?? "",
        model: instrument?.model ?? "",
        serialNumber: instrument?.serialNumber ?? "",
        instrumentTypeName: type?.name ?? "",
        capacity: instrument?.capacity ?? null,
        accuracyClass: instrument?.accuracyClass ?? null,
        businessName: business?.businessName ?? "",
        result: "PASS",
        ruleReference: rule?.id ?? "",
        verifiedAt: certificate.verifiedAt,
        validUntil: certificate.validUntil,
        issuingAuthority,
      }),
    );
    const tamperDetected = recomputedHash !== certificate.payloadHash;

    await db.orm.public.CertificateVerification.create({
      certificateId: certificate.id,
      ipAddress: ipAddress ?? null,
      presentedPayloadHash: null,
      matched: valid,
    });

    return {
      valid,
      certificateCode: certificate.certificateCode,
      status: certificate.status,
      verifiedAt: certificate.verifiedAt,
      validUntil: certificate.validUntil,
      issuingAuthority,
      instrument: {
        code: instrument?.instrumentCode ?? "",
        category: type?.name ?? "",
        manufacturer: instrument?.manufacturer ?? "",
        model: instrument?.model ?? "",
        serialNumber: instrument?.serialNumber ?? "",
        accuracyClass: instrument?.accuracyClass ?? null,
        capacity: instrument?.capacity ?? null,
        capacityUnit: type?.unit ?? null,
      },
      integrity: {
        isHashVerified: !tamperDetected,
        tamperDetected,
      },
      verificationTimestamp: new Date().toISOString(),
    };
  },
};
