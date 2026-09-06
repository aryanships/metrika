import "dotenv/config";
import assert from "node:assert";
import { db } from "../prisma/db";
import { certificatesService } from "../modules/certificates/server/service";
import { verificationService } from "../modules/verification/server/service";
import { buildCanonicalPayload, hashPayload } from "../modules/certificates/server/payload";
import type { AppUser } from "../middleware/context";

function codeOf(error: unknown): string | undefined {
  return (error as { code?: string }).code;
}

function rejectsCode(promise: Promise<unknown>, code: string): Promise<void> {
  return assert.rejects(promise, (error) => codeOf(error) === code);
}

async function loadUser(email: string, roles: AppUser["roles"], businessId: string | null = null): Promise<AppUser> {
  const user = await db.orm.public.User.where({ email }).first();
  if (!user) throw new Error(`Missing seed user: ${email}`);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles,
    phone: user.phone,
    businessId,
    isActive: user.isActive,
  };
}

const canonical = {
  certificateCode: "CERT-TEST",
  applicationCode: "APP-TEST",
  instrumentCode: "DMI-TEST",
  manufacturer: "M",
  model: "M1",
  serialNumber: "S1",
  instrumentTypeName: "T",
  capacity: "10",
  accuracyClass: "Class III",
  businessName: "B",
  result: "PASS" as const,
  ruleReference: "R1",
  verifiedAt: "2026-01-01T00:00:00.000Z",
  validUntil: "2027-01-01T00:00:00.000Z",
  issuingAuthority: "Legal Metrology Department",
};

async function main(): Promise<void> {
  // 1. Canonical payload is deterministic (same input → same hash, changed input → new hash).
  assert.equal(hashPayload(buildCanonicalPayload(canonical)), hashPayload(buildCanonicalPayload(canonical)));
  assert.notEqual(
    hashPayload(buildCanonicalPayload(canonical)),
    hashPayload(buildCanonicalPayload({ ...canonical, validUntil: "2029-01-01T00:00:00.000Z" })),
  );

  // 2. Public verification returns safe fields only and logs a check.
  const beforeChecks = await db.orm.public.CertificateVerification.aggregate((a) => ({ total: a.count() }));
  const publicResult = await verificationService.verifyCertificate({ certificateCode: "CERT-2026-0008" }, "203.0.113.9");
  assert.equal(publicResult.certificateCode, "CERT-2026-0008");
  assert.equal(publicResult.instrument.code.length > 0, true);
  assert.ok("phone" in publicResult === false && "email" in publicResult === false);
  const afterChecks = await db.orm.public.CertificateVerification.aggregate((a) => ({ total: a.count() }));
  assert.equal(afterChecks.total, beforeChecks.total + 1);

  // Unknown code → NOT_FOUND.
  await rejectsCode(verificationService.verifyCertificate({ certificateCode: "NOPE-0000" }), "NOT_FOUND");

  // 3. Issuance from a PASSED application, duplicate rejection, and history.
  const owner = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"]);
  const business = await db.orm.public.Business.where({ userId: owner.id }).first();
  if (!business) throw new Error("Missing Reliance Fresh business");
  owner.businessId = business.id;

  const instrument = await db.orm.public.Instrument.where({ instrumentCode: "DMI-EWB-002" }).first();
  if (!instrument) throw new Error("Missing DMI-EWB-002 instrument");

  const stateAdmin = await loadUser("stateadmin.mh@metrika.gov.in", ["STATE_ADMIN"]);
  const lmo = await db.orm.public.Lmo.where({ employeeId: "LMO-MH-001" }).first();
  if (!lmo) throw new Error("Missing LMO-MH-001");
  const rule = await db.orm.public.RegulatoryRule
    .where({ instrumentTypeId: instrument.instrumentTypeId, accuracyClass: instrument.accuracyClass ?? "" })
    .first();
  if (!rule) throw new Error("Missing rule for DMI-EWB-002");

  const created = { applicationId: "", inspectionId: "", certificateId: "" };
  try {
    const application = await db.orm.public.Application.create({
      applicationCode: `APP-SELFCHECK-${Date.now()}`,
      instrumentId: instrument.id,
      type: "RE_VERIFICATION",
      status: "PASSED",
      route: "LMO",
      priority: "MEDIUM",
    });
    created.applicationId = application.id;

    const inspection = await db.orm.public.Inspection.create({
      applicationId: application.id,
      lmoId: lmo.id,
      gatcId: null,
      performedById: lmo.userId,
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      finalizedAt: new Date().toISOString(),
      finalizedById: lmo.userId,
      result: "PASS",
      ruleVersionId: rule.id,
      templateId: null,
      notes: null,
    });
    created.inspectionId = inspection.id;

    // Not-yet-passed application cannot issue.
    await db.orm.public.Application.where({ id: application.id }).update({ status: "UNDER_REVIEW" });
    await rejectsCode(certificatesService.issue({ applicationId: application.id }, stateAdmin), "INVALID_STATE");
    await db.orm.public.Application.where({ id: application.id }).update({ status: "PASSED" });

    const issued = await certificatesService.issue({ applicationId: application.id }, stateAdmin);
    created.certificateId = issued.id;

    assert.equal(issued.status, "ACTIVE");
    assert.equal(issued.payloadHash.length, 64);
    assert.equal(issued.validUntil > issued.verifiedAt, true);
    assert.equal(issued.issuingAuthority, "Legal Metrology Department, Maharashtra");

    const applicationAfter = await db.orm.public.Application.first({ id: application.id });
    assert.equal(applicationAfter?.status, "CERTIFICATE_GENERATED");

    const notification = await db.orm.public.Notification.where({ certificateId: issued.id }).first();
    assert.ok(notification, "issuance should notify the owner");

    // Duplicate issuance rejected.
    await rejectsCode(certificatesService.issue({ applicationId: application.id }, stateAdmin), "INVALID_STATE");

    // Owner can read; a different owner cannot.
    const outsider = await loadUser("owner.bpcl@petro.in", ["INSTRUMENT_OWNER"]);
    const outsiderBusiness = await db.orm.public.Business.where({ userId: outsider.id }).first();
    outsider.businessId = outsiderBusiness?.id ?? null;
    await rejectsCode(certificatesService.get({ id: issued.id }, outsider), "FORBIDDEN");
    const mine = await certificatesService.listMine({ page: 1, limit: 100, sortOrder: "desc" }, owner);
    assert.ok(mine.items.some((c) => c.id === issued.id));
  } finally {
    if (created.certificateId) {
      await db.orm.public.Certificate.where({ id: created.certificateId }).delete();
    }
    if (created.inspectionId) {
      await db.orm.public.Inspection.where({ id: created.inspectionId }).delete();
    }
    if (created.applicationId) {
      await db.orm.public.Application.where({ id: created.applicationId }).delete();
    }
  }

  // 4. GATC field authority: a GATC operator (no global role) issues for a
  //    GATC-routed inspection performed by another centre member.
  const gatcOperator = await loadUser("operator.apex@gatc.org", []);
  const gatcManager = await loadUser("manager.apex@gatc.org", []);
  const gatc = await db.orm.public.Gatc.where({ approvalNumber: "GATC-MH-PUN-001" }).first();
  if (!gatc) throw new Error("Missing GATC-MH-PUN-001");
  const operatorMembership = await db.orm.public.GatcMembership.where({
    userId: gatcOperator.id,
    gatcId: gatc.id,
    isActive: true,
  }).first();
  if (!operatorMembership) throw new Error("Missing operator membership for Apex GATC");

  const gatcInstrument = await db.orm.public.Instrument.where({ instrumentCode: "DMI-EWB-001" }).first();
  if (!gatcInstrument) throw new Error("Missing DMI-EWB-001 instrument");
  const gatcRule = await db.orm.public.RegulatoryRule
    .where({ instrumentTypeId: gatcInstrument.instrumentTypeId, accuracyClass: gatcInstrument.accuracyClass ?? "" })
    .first();
  if (!gatcRule) throw new Error("Missing rule for DMI-EWB-001");

  const gatcCreated = { applicationId: "", inspectionId: "", certificateId: "" };
  try {
    const app = await db.orm.public.Application.create({
      applicationCode: `APP-GATC-SELFCHECK-${Date.now()}`,
      instrumentId: gatcInstrument.id,
      type: "RE_VERIFICATION",
      status: "PASSED",
      route: "GATC",
      priority: "MEDIUM",
    });
    gatcCreated.applicationId = app.id;

    await db.orm.public.Inspection.create({
      applicationId: app.id,
      lmoId: null,
      gatcId: gatc.id,
      performedById: gatcManager.id,
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      finalizedAt: new Date().toISOString(),
      finalizedById: gatcManager.id,
      result: "PASS",
      ruleVersionId: gatcRule.id,
      templateId: null,
      notes: null,
    });

    const issued = await certificatesService.issue({ applicationId: app.id }, gatcOperator);
    gatcCreated.certificateId = issued.id;
    assert.equal(issued.status, "ACTIVE");
  } finally {
    if (gatcCreated.certificateId) await db.orm.public.Certificate.where({ id: gatcCreated.certificateId }).delete();
    if (gatcCreated.inspectionId) await db.orm.public.Inspection.where({ id: gatcCreated.inspectionId }).delete();
    if (gatcCreated.applicationId) await db.orm.public.Application.where({ id: gatcCreated.applicationId }).delete();
  }

  console.log("certificates self-check passed");
}

main()
  .catch((error) => {
    console.error("certificates self-check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
