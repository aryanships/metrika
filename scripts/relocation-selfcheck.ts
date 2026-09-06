import "dotenv/config";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import { applicationsService } from "../modules/applications/server/service";
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

async function createAttachment(instrumentId: string, uploadedById: string): Promise<{ fileId: string; attachmentId: string }> {
  const file = await orm.FileObject.create({
    bucket: "metrika",
    objectKey: `relocation/${randomUUID()}.jpg`,
    fileName: "relocation-proof.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 4,
    sha256: null,
    metadata: null,
    uploadedById,
  });
  const attachment = await orm.Attachment.create({
    fileId: file.id,
    instrumentId,
    applicationId: null,
    inspectionId: null,
    kind: "INSTRUMENT_FRONT" as never,
    capturedAt: null,
    capturedById: uploadedById,
    latitude: null,
    longitude: null,
  });
  return { fileId: file.id, attachmentId: attachment.id };
}

async function main(): Promise<void> {
  const owner = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"]);
  const business = await orm.Business.where({ userId: owner.id }).first();
  if (!business) throw new Error("Missing Reliance business");
  owner.businessId = business.id;

  const stateAdmin = await loadUser("stateadmin.mh@metrika.gov.in", ["STATE_ADMIN"]);

  const instrument = await orm.Instrument.where({ instrumentCode: "DMI-EWB-001" }).first();
  if (!instrument) throw new Error("Missing DMI-EWB-001 instrument");

  const newUnit = await orm.AdministrativeUnit.where({ name: "Bandra West", type: "VILLAGE" }).first();
  if (!newUnit) throw new Error("Missing Bandra West village");

  const original = {
    address: instrument.address,
    administrativeUnitId: instrument.administrativeUnitId,
    postalCode: instrument.postalCode,
    latitude: instrument.latitude,
    longitude: instrument.longitude,
  };

  let applicationId = "";
  let attachmentId = "";
  const fileIds: string[] = [];
  try {
    // Supporting evidence is required before submission.
    const att = await createAttachment(instrument.id, owner.id);
    attachmentId = att.attachmentId;
    fileIds.push(att.fileId);

    // 1. Owner files a relocation request carrying the new location.
    const draft = await applicationsService.createDraft(
      {
        instrumentId: instrument.id,
        type: "RELOCATION_RE_VERIFICATION",
        requestedChanges: {
          address: "48 Hill Road, Bandra West, Mumbai",
          administrativeUnitId: newUnit.id,
          postalCode: "400050",
          latitude: "19.0596",
          longitude: "72.8295",
        },
      },
      owner,
    );
    applicationId = draft.id;

    await applicationsService.submit({ id: draft.id }, owner);
    await applicationsService.startReview({ id: draft.id }, stateAdmin);

    // 2. Approval applies the relocation: history written + instrument updated.
    await applicationsService.approve({ id: draft.id }, stateAdmin);

    const updated = await orm.Instrument.first({ id: instrument.id });
    assert.equal(updated!.administrativeUnitId, newUnit.id, "instrument location unit should change");
    assert.equal(updated!.address, "48 Hill Road, Bandra West, Mumbai");

    const history = await orm.InstrumentLocationHistory.where({ instrumentId: instrument.id })
      .orderBy((h) => h.effectiveFrom.desc())
      .all();
    assert.ok(history.length >= 2, "relocation should record from + to location periods");
    const current = history[0]!;
    assert.equal(current.administrativeUnitId, newUnit.id);
    assert.equal(current.effectiveUntil, null, "current location period should be open");
    const prior = history[1]!;
    assert.equal(prior.administrativeUnitId, original.administrativeUnitId, "prior period records the old unit");
  } finally {
    if (applicationId) {
      await orm.Instrument.where({ id: instrument.id }).update(original);
      await orm.InstrumentLocationHistory.where({ instrumentId: instrument.id }).deleteAll();
      await orm.Application.where({ id: applicationId }).delete();
    }
    if (attachmentId) await orm.Attachment.where({ id: attachmentId }).delete();
    if (fileIds.length) await orm.FileObject.where((f) => f.id.in(fileIds)).deleteAll();
  }

  console.log("relocation self-check passed");
}

main()
  .catch((error) => {
    console.error("relocation self-check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
