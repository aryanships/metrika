import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../prisma/db";
import { storage } from "../lib/storage";
import { filesService } from "../modules/files/server/service";
import { instrumentsService } from "../modules/instruments/server/service";
import { applicationsService } from "../modules/applications/server/service";
import { inspectionsService } from "../modules/inspections/server/service";
import { verificationService } from "../modules/verification/server/service";
import type { AppUser } from "../middleware/context";

async function loadTestUsers(): Promise<{ owner: AppUser; lmo: AppUser }> {
  const ownerUser = await db.orm.public.User.where({ email: "owner.reliance@retail.in" }).first();
  assert(ownerUser, "Owner user not found in seed");
  const business = await db.orm.public.Business.where({ userId: ownerUser.id }).first();
  assert(business, "Owner business not found in seed");

  const lmoUser = await db.orm.public.User.where({ email: "lmo.sharma@metrika.gov.in" }).first();
  assert(lmoUser, "LMO user not found in seed");

  const owner: AppUser = {
    id: ownerUser.id,
    email: ownerUser.email,
    fullName: ownerUser.fullName,
    roles: ["INSTRUMENT_OWNER"],
    phone: ownerUser.phone,
    businessId: business.id,
    isActive: true,
  };

  const lmo: AppUser = {
    id: lmoUser.id,
    email: lmoUser.email,
    fullName: lmoUser.fullName,
    roles: ["LMO"],
    phone: lmoUser.phone,
    businessId: null,
    isActive: true,
  };

  return { owner, lmo };
}

async function uploadDirect(url: string, contentType: string, data: Buffer | string): Promise<void> {
  const body = typeof data === "string" ? data : new Uint8Array(data);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  assert(res.ok, `Upload failed with status ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log("🚀 Starting Full End-to-End Workflow Verification...");
  const { owner, lmo } = await loadTestUsers();

  const instrumentTypes = await db.orm.public.InstrumentType.all();
  assert(instrumentTypes.length > 0, "Instrument types missing");
  const ewbType = instrumentTypes.find((t) => t.code === "EWB") ?? instrumentTypes[0]!;

  const adminUnits = await db.orm.public.AdministrativeUnit.all();
  assert(adminUnits.length > 0, "Admin units missing");
  const unit = adminUnits[0]!;

  // 1. REGISTER INSTRUMENT
  console.log("Step 1: Registering new instrument...");
  const rand = Math.floor(Math.random() * 90000 + 10000);
  const serial = `SN-AUDIT-${rand}`;

  const instrument = await instrumentsService.create(
    {
      instrumentTypeId: ewbType.id,
      manufacturer: "Mettler Toledo",
      model: "Digital Precision 2026",
      serialNumber: serial,
      capacity: "50.0",
      accuracyClass: "Class III",
      yearOfManufacture: 2026,
      address: "Survey No. 44, Hadapsar Industrial Area",
      administrativeUnitId: unit.id,
      postalCode: "411028",
    },
    owner.businessId,
  );
  assert(instrument.id, "Instrument ID missing");
  console.log(`✓ Instrument registered: ${instrument.instrumentCode} (${instrument.id})`);

  // 2. UPLOAD PHOTOS & DOCUMENTS
  console.log("Step 2: Uploading instrument photos and documents via presigned URLs...");
  const fakePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );

  // 2a. Instrument Front Photo
  const frontIntent = await filesService.createUploadIntent(
    {
      kind: "INSTRUMENT_FRONT",
      target: { instrumentId: instrument.id },
      fileName: "front_view.png",
      contentType: "image/png",
      sizeBytes: fakePng.length,
    },
    owner,
  );
  await uploadDirect(frontIntent.uploadUrl, "image/png", fakePng);
  const frontAtt = await filesService.confirmUpload({ uploadToken: frontIntent.uploadToken }, owner);
  assert.equal(frontAtt.instrumentId, instrument.id);
  assert.equal(frontAtt.kind, "INSTRUMENT_FRONT");
  console.log("✓ Front view photo uploaded and confirmed");

  // 2b. Rating Label Photo
  const plateIntent = await filesService.createUploadIntent(
    {
      kind: "NAMEPLATE",
      target: { instrumentId: instrument.id },
      fileName: "nameplate.png",
      contentType: "image/png",
      sizeBytes: fakePng.length,
    },
    owner,
  );
  await uploadDirect(plateIntent.uploadUrl, "image/png", fakePng);
  const plateAtt = await filesService.confirmUpload({ uploadToken: plateIntent.uploadToken }, owner);
  assert.equal(plateAtt.kind, "NAMEPLATE");
  console.log("✓ Nameplate photo uploaded and confirmed");

  // 2c. Purchase Document (PDF)
  const fakePdf = Buffer.from("%PDF-1.4 test invoice content %%EOF");
  const pdfIntent = await filesService.createUploadIntent(
    {
      kind: "PURCHASE_DOCUMENT",
      target: { instrumentId: instrument.id },
      fileName: "tax_invoice.pdf",
      contentType: "application/pdf",
      sizeBytes: fakePdf.length,
    },
    owner,
  );
  await uploadDirect(pdfIntent.uploadUrl, "application/pdf", fakePdf);
  const pdfAtt = await filesService.confirmUpload({ uploadToken: pdfIntent.uploadToken }, owner);
  assert.equal(pdfAtt.kind, "PURCHASE_DOCUMENT");
  console.log("✓ Purchase document uploaded and confirmed");

  // Verify listAttachments returns all 3 attachments
  const attachments = await filesService.listAttachments({ instrumentId: instrument.id }, owner);
  assert.equal(attachments.length, 3, "Expected 3 attachments");
  console.log("✓ All 3 attachments verified in storage repository");

  // 3. CREATE & SUBMIT APPLICATION
  console.log("Step 3: Creating and submitting verification application...");
  const draftApp = await applicationsService.createDraft(
    {
      instrumentId: instrument.id,
      type: "INITIAL_VERIFICATION",
    },
    owner,
  );
  assert(draftApp.id, "Draft application ID missing");
  console.log(`✓ Draft application created: ${draftApp.applicationCode}`);

  const submittedApp = await applicationsService.submit({ id: draftApp.id }, owner);
  assert.equal(submittedApp.status, "SUBMITTED");
  console.log(`✓ Application submitted successfully (Status: ${submittedApp.status})`);

  // 4. VERIFY PASSPORT RETRIEVAL
  console.log("Step 4: Fetching instrument digital passport...");
  const passport = await instrumentsService.passport({ id: instrument.id });
  assert.equal(passport.instrument.id, instrument.id);
  assert.equal(passport.applications.length, 1);
  console.log("✓ Digital passport verified with linked application");

  // 5. PUBLIC VERIFICATION TEST
  console.log("Step 5: Testing public verification search...");
  const activeCert = await db.orm.public.Certificate.where({ status: "ACTIVE" }).first();
  if (activeCert) {
    const pubVerify = await verificationService.verifyCertificate({
      certificateCode: activeCert.certificateCode,
    });
    assert(pubVerify.valid, "Active certificate must verify as valid");
    assert.equal(pubVerify.certificateCode, activeCert.certificateCode);
    console.log(`✓ Public certificate verification passed for ${activeCert.certificateCode}`);
  }

  // CLEANUP TEST DATA
  console.log("Step 6: Cleaning up created test data...");
  await db.orm.public.Attachment.where({ instrumentId: instrument.id }).delete();
  await db.orm.public.ApplicationStatusHistory.where({ applicationId: draftApp.id }).delete();
  await db.orm.public.Application.where({ id: draftApp.id }).delete();
  await db.orm.public.Instrument.where({ id: instrument.id }).delete();
  for (const key of [
    frontIntent.uploadToken,
    plateIntent.uploadToken,
    pdfIntent.uploadToken,
  ]) {
    const objKey = JSON.parse(Buffer.from(key.split(".")[0]!, "base64url").toString("utf8")).objectKey;
    await storage.deleteObject(objKey).catch(() => {});
  }
  console.log("✓ Test data cleaned up successfully");

  console.log("\n🎉 ALL END-TO-END WORKFLOW CHECKS PASSED!");
}

main()
  .catch((err) => {
    console.error("❌ E2E verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
