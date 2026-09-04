import "dotenv/config";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import { applicationsService } from "../modules/applications/server/service";
import { canTransition } from "../modules/applications/server/state-machine";
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

async function main(): Promise<void> {
  // 1. State-machine pure checks.
  assert(canTransition("DRAFT", "SUBMITTED", "OWNER"));
  assert(canTransition("DOCUMENTS_REQUIRED", "SUBMITTED", "OWNER"));
  assert(canTransition("SUBMITTED", "UNDER_REVIEW", "ADMIN"));
  assert(canTransition("UNDER_REVIEW", "APPROVED", "ADMIN"));
  assert(!canTransition("DRAFT", "APPROVED", "OWNER"));
  assert(!canTransition("SUBMITTED", "APPROVED", "ADMIN"));
  assert(!canTransition("SUBMITTED", "UNDER_REVIEW", "OWNER"));
  assert(!canTransition("APPROVED", "CANCELLED", "OWNER"));

  const ownerA = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"]);
  const business = await db.orm.public.Business.where({ userId: ownerA.id }).first();
  if (!business) throw new Error("Missing Reliance Fresh business");
  ownerA.businessId = business.id;

  const instrument = await db.orm.public.Instrument.where({ businessId: business.id }).first();
  if (!instrument) throw new Error("Missing Reliance Fresh instrument");

  const stateAdmin = await loadUser("stateadmin.mh@metrika.gov.in", ["STATE_ADMIN"]);
  const mumbaiAdmin = await loadUser("distadmin.mumbai@metrika.gov.in", ["DISTRICT_ADMIN"]);

  const created: { applicationId?: string; attachmentId?: string; fileId?: string } = {};

  try {
    // 2. Draft creation + completeness gate.
    const draft = await applicationsService.createDraft(
      { instrumentId: instrument.id, type: "RE_VERIFICATION" },
      ownerA,
    );
    created.applicationId = draft.id;

    const incomplete = await applicationsService.completeness({ id: draft.id }, ownerA);
    assert.equal(incomplete.complete, false, "draft without evidence should be incomplete");

    await rejectsCode(applicationsService.submit({ id: draft.id }, ownerA), "VALIDATION_ERROR");

    // 3. Duplicate open application is blocked.
    await rejectsCode(
      applicationsService.createDraft({ instrumentId: instrument.id, type: "RE_VERIFICATION" }, ownerA),
      "CONFLICT",
    );

    // 4. Cross-owner access denied.
    const outsider: AppUser = { ...ownerA, id: "someone-else", businessId: "another-business" };
    await rejectsCode(applicationsService.get({ id: draft.id }, outsider), "FORBIDDEN");
    await rejectsCode(applicationsService.submit({ id: draft.id }, outsider), "FORBIDDEN");

    // 5. Attach evidence, then submit.
    const file = await db.orm.public.FileObject.create({
      bucket: "metrika",
      objectKey: `selfcheck/${randomUUID()}.jpg`,
      fileName: "front.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 4,
      sha256: null,
      metadata: null,
      uploadedById: ownerA.id,
    });
    const attachment = await db.orm.public.Attachment.create({
      fileId: file.id,
      instrumentId: instrument.id,
      applicationId: null,
      inspectionId: null,
      kind: "INSTRUMENT_FRONT",
      capturedAt: null,
      capturedById: null,
      latitude: null,
      longitude: null,
    });
    created.fileId = file.id;
    created.attachmentId = attachment.id;

    const complete = await applicationsService.completeness({ id: draft.id }, ownerA);
    assert.equal(complete.complete, true, "draft with evidence should be complete");

    const submitted = await applicationsService.submit({ id: draft.id }, ownerA);
    assert.equal(submitted.status, "SUBMITTED");

    // 6. Double submit rejected.
    await rejectsCode(applicationsService.submit({ id: draft.id }, ownerA), "INVALID_STATE");

    // 7. Review flow: review → corrections → resubmit → review → approve.
    await applicationsService.startReview({ id: draft.id }, stateAdmin);
    await applicationsService.requestCorrections({ id: draft.id, reason: "Upload clearer serial photo" }, stateAdmin);

    const resubmitted = await applicationsService.submit({ id: draft.id }, ownerA);
    assert.equal(resubmitted.status, "SUBMITTED");

    await applicationsService.startReview({ id: draft.id }, stateAdmin);

    // Owner cannot perform admin actions; admin cannot submit.
    await rejectsCode(applicationsService.approve({ id: draft.id }, ownerA), "FORBIDDEN");
    await rejectsCode(applicationsService.submit({ id: draft.id }, stateAdmin), "FORBIDDEN");

    // 8. Out-of-scope review denied (Mumbai admin on a Pune instrument).
    await rejectsCode(applicationsService.approve({ id: draft.id }, mumbaiAdmin), "FORBIDDEN");

    const approved = await applicationsService.approve({ id: draft.id }, stateAdmin);
    assert.equal(approved.status, "APPROVED");

    console.log("applications self-check passed");
  } finally {
    if (created.applicationId) {
      await db.orm.public.Application.where({ id: created.applicationId }).delete();
    }
    if (created.attachmentId) {
      await db.orm.public.Attachment.where({ id: created.attachmentId }).delete();
    }
    if (created.fileId) {
      await db.orm.public.FileObject.where({ id: created.fileId }).delete();
    }
  }
}

main()
  .catch((error) => {
    console.error("applications self-check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
