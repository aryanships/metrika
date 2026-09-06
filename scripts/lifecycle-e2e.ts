import "dotenv/config";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import { applicationsService } from "../modules/applications/server/service";
import { schedulingService } from "../modules/scheduling/server/service";
import { inspectionsService } from "../modules/inspections/server/service";
import { certificatesService } from "../modules/certificates/server/service";
import { verificationService } from "../modules/verification/server/service";
import { instrumentsService } from "../modules/instruments/server/service";
import type { AppUser } from "../middleware/context";

const orm = db.orm.public;

async function loadUser(email: string, roles: AppUser["roles"], businessId: string | null = null): Promise<AppUser> {
  const user = await orm.User.where({ email }).first();
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

async function createAttachment(target: { instrumentId?: string; inspectionId?: string }, kind: string, uploadedById: string): Promise<{ fileId: string; attachmentId: string }> {
  const file = await orm.FileObject.create({
    bucket: "metrika",
    objectKey: `e2e/${randomUUID()}.jpg`,
    fileName: "evidence.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 4,
    sha256: null,
    metadata: null,
    uploadedById,
  });
  const attachment = await orm.Attachment.create({
    fileId: file.id,
    instrumentId: target.instrumentId ?? null,
    applicationId: null,
    inspectionId: target.inspectionId ?? null,
    kind: kind as never,
    capturedAt: null,
    capturedById: uploadedById,
    latitude: null,
    longitude: null,
  });
  return { fileId: file.id, attachmentId: attachment.id };
}

const EVIDENCE_KINDS = ["INSTRUMENT_FRONT", "SERIAL_NUMBER", "NAMEPLATE", "VERIFICATION_AREA", "TEST_SETUP"] as const;

async function main(): Promise<void> {
  const owner = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"]);
  const business = await orm.Business.where({ userId: owner.id }).first();
  if (!business) throw new Error("Missing Reliance Fresh business");
  owner.businessId = business.id;

  const instrument = await orm.Instrument.where({ instrumentCode: "DMI-EWB-002" }).first();
  if (!instrument) throw new Error("Missing DMI-EWB-002 instrument");

  const stateAdmin = await loadUser("stateadmin.mh@metrika.gov.in", ["STATE_ADMIN"]);
  const lmoUser = await loadUser("lmo.sharma@metrika.gov.in", ["LMO"]);
  const lmo = await orm.Lmo.where({ userId: lmoUser.id }).first();
  if (!lmo) throw new Error("Missing LMO-MH-001 profile");

  const created = {
    initialApplicationId: "",
    reverificationApplicationId: "",
    certificateId: "",
    instrumentAttachmentId: "",
    fileIds: [] as string[],
  };

  try {
    // 1. Owner creates + submits an initial verification application.
    const draft = await applicationsService.createDraft({ instrumentId: instrument.id, type: "INITIAL_VERIFICATION" }, owner);
    created.initialApplicationId = draft.id;

    const instAtt = await createAttachment({ instrumentId: instrument.id }, "INSTRUMENT_FRONT", owner.id);
    created.instrumentAttachmentId = instAtt.attachmentId;
    created.fileIds.push(instAtt.fileId);

    const submitted = await applicationsService.submit({ id: draft.id }, owner);
    assert.equal(submitted.status, "SUBMITTED");

    // 2. Admin reviews, recommends, assigns, schedules.
    await applicationsService.startReview({ id: draft.id }, stateAdmin);
    const approved = await applicationsService.approve({ id: draft.id }, stateAdmin);
    assert.equal(approved.status, "APPROVED");

    const recommendation = await schedulingService.recommend({ applicationId: draft.id }, stateAdmin);
    const lmoCandidate = recommendation.candidates.find((c) => c.candidateType === "LMO" && c.candidateId === lmo.id);
    assert.ok(lmoCandidate, "LMO-MH-001 should be an eligible candidate");

    await schedulingService.assign({ applicationId: draft.id, route: "LMO", assigneeId: lmo.id }, stateAdmin);
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 2 * 86400000).toISOString();
    await schedulingService.schedule({ applicationId: draft.id, scheduledStartAt: start, scheduledEndAt: end }, stateAdmin);

    // 3. LMO performs the inspection and submits a PASS.
    const started = await inspectionsService.start({ applicationId: draft.id }, lmoUser);
    assert.equal(started.application.status, "VERIFICATION_IN_PROGRESS");

    await inspectionsService.saveDraft(
      {
        applicationId: draft.id,
        measurements: [{ sequence: 1, code: "ZERO_LOAD", label: "Zero load", unit: "kg", standardValue: "0.000", observedValue: "0.000" }],
        responses:
          started.template?.items.map((item) => ({
            templateItemId: item.id,
            value: item.kind === "CHECKLIST" ? true : item.kind === "NUMERIC" ? 0 : "ok",
          })) ?? [],
      },
      lmoUser,
    );

    for (const kind of EVIDENCE_KINDS) {
      const att = await createAttachment({ inspectionId: started.id }, kind, lmoUser.id);
      created.fileIds.push(att.fileId);
    }

    const passed = await inspectionsService.submit({ applicationId: draft.id }, lmoUser);
    assert.equal(passed.result, "PASS");

    // 4. Certificate issuance.
    const certificate = await certificatesService.issue({ applicationId: draft.id }, stateAdmin);
    created.certificateId = certificate.id;
    assert.equal(certificate.status, "ACTIVE");

    // 5. Public verification + passport.
    const verified = await verificationService.verifyCertificate({ certificateCode: certificate.certificateCode });
    assert.equal(verified.valid, true);

    const passport = await instrumentsService.passport({ id: instrument.id });
    assert.ok(passport.certificates.some((c) => c.id === certificate.id), "passport should list the new certificate");

    // 6. Re-verification application against the same instrument.
    const reverification = await applicationsService.createDraft({ instrumentId: instrument.id, type: "RE_VERIFICATION" }, owner);
    assert.ok(reverification.id, "re-verification application should be creatable");
    created.reverificationApplicationId = reverification.id;

    console.log("lifecycle e2e passed");
  } finally {
    if (created.certificateId) {
      await orm.Certificate.where({ id: created.certificateId }).delete();
    }
    if (created.initialApplicationId) {
      await orm.Application.where({ id: created.initialApplicationId }).delete();
    }
    if (created.reverificationApplicationId) {
      await orm.Application.where({ id: created.reverificationApplicationId }).delete();
    }
    if (created.instrumentAttachmentId) {
      await orm.Attachment.where({ id: created.instrumentAttachmentId }).delete();
    }
    if (created.fileIds.length) {
      await orm.FileObject.where((f) => f.id.in(created.fileIds)).deleteAll();
    }
  }
}

main()
  .catch((error) => {
    console.error("lifecycle e2e failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
