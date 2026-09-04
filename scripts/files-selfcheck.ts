import "dotenv/config";
import assert from "node:assert";
import { db } from "../prisma/db";
import { storage } from "../lib/storage";
import { filesService } from "../modules/files/server/service";
import {
  allowedContentTypes,
  isKindAllowedOnTarget,
  maxSizeBytes,
  sanitizeFileName,
} from "../modules/files/policy";
import type { AppUser } from "../middleware/context";

function decodeObjectKey(token: string): string {
  return JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString("utf8")).objectKey;
}

function codeOf(error: unknown): string | undefined {
  return (error as { code?: string }).code;
}

function rejectsCode(promise: Promise<unknown>, code: string): Promise<void> {
  return assert.rejects(promise, (error) => codeOf(error) === code);
}

async function loadOwners(): Promise<{ user: AppUser; instrumentId: string }[]> {
  const roles = await db.orm.public.UserRole.where({ role: "INSTRUMENT_OWNER" }).all();
  const owners: { user: AppUser; instrumentId: string }[] = [];
  for (const role of roles) {
    const business = await db.orm.public.Business.where({ userId: role.userId }).first();
    if (!business) continue;
    const instrument = await db.orm.public.Instrument.where({ businessId: business.id }).first();
    if (!instrument) continue;
    const user = await db.orm.public.User.first({ id: role.userId });
    if (!user) continue;
    owners.push({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: ["INSTRUMENT_OWNER"],
        phone: user.phone,
        businessId: business.id,
        isActive: user.isActive,
      },
      instrumentId: instrument.id,
    });
  }
  return owners;
}

async function main(): Promise<void> {
  // 1. Policy: MIME / size / kind / sanitization.
  assert(!allowedContentTypes("INSTRUMENT_FRONT").includes("text/html"));
  assert(allowedContentTypes("INSPECTION_VIDEO").includes("video/mp4"));
  assert(allowedContentTypes("PREVIOUS_CERTIFICATE").includes("application/pdf"));
  assert.equal(maxSizeBytes("INSPECTION_VIDEO"), 100 * 1024 * 1024);
  assert.equal(maxSizeBytes("INSTRUMENT_FRONT"), 10 * 1024 * 1024);
  assert(!isKindAllowedOnTarget("VERIFICATION_AREA", "instrument"));
  assert(isKindAllowedOnTarget("VERIFICATION_AREA", "inspection"));
  assert(!sanitizeFileName("../../etc/passwd").includes("/"));

  // 2. Tampered / forged upload token is rejected before any DB write.
  await rejectsCode(
    filesService.confirmUpload(
      { uploadToken: "forged.body" },
      { id: "x", email: "x@x.io", fullName: "x", roles: ["INSTRUMENT_OWNER"], phone: null, businessId: "x", isActive: true },
    ),
    "UNAUTHORIZED",
  );

  const owners = await loadOwners();
  assert(owners.length >= 2, "seed data must include two owners with instruments");
  const [ownerA, ownerB] = owners as [typeof owners[0], typeof owners[0]];

  // 3. Happy path: intent → direct upload → confirm → download.
  const intent = await filesService.createUploadIntent(
    {
      kind: "INSTRUMENT_FRONT",
      target: { instrumentId: ownerA.instrumentId },
      fileName: "front.jpg",
      contentType: "image/jpeg",
      sizeBytes: 4,
    },
    ownerA.user,
  );
  const objectKey = decodeObjectKey(intent.uploadToken);
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: "test",
  });
  assert(put.ok, `PUT failed: ${put.status}`);
  assert.equal(intent.maxSizeBytes, 10 * 1024 * 1024);

  const attachment = await filesService.confirmUpload({ uploadToken: intent.uploadToken }, ownerA.user);
  assert.equal(attachment.instrumentId, ownerA.instrumentId);
  assert.equal(attachment.fileName, "front.jpg");

  const download = await filesService.getDownloadUrl({ fileId: attachment.fileId }, ownerA.user);
  assert(download.downloadUrl.startsWith("http"));

  // 4. Cross-owner denial.
  await rejectsCode(
    filesService.createUploadIntent(
      {
        kind: "INSTRUMENT_FRONT",
        target: { instrumentId: ownerA.instrumentId },
        fileName: "front.jpg",
        contentType: "image/jpeg",
        sizeBytes: 4,
      },
      ownerB.user,
    ),
    "FORBIDDEN",
  );
  await rejectsCode(
    filesService.getDownloadUrl({ fileId: attachment.fileId }, ownerB.user),
    "FORBIDDEN",
  );

  // 5. Unsupported MIME and oversized file are rejected by policy.
  await rejectsCode(
    filesService.createUploadIntent(
      {
        kind: "INSTRUMENT_FRONT",
        target: { instrumentId: ownerA.instrumentId },
        fileName: "bad.html",
        contentType: "text/html",
        sizeBytes: 4,
      },
      ownerA.user,
    ),
    "VALIDATION_ERROR",
  );
  await rejectsCode(
    filesService.createUploadIntent(
      {
        kind: "INSTRUMENT_FRONT",
        target: { instrumentId: ownerA.instrumentId },
        fileName: "big.jpg",
        contentType: "image/jpeg",
        sizeBytes: 11 * 1024 * 1024,
      },
      ownerA.user,
    ),
    "VALIDATION_ERROR",
  );

  // Cleanup: DB rows + object.
  await db.orm.public.Attachment.where({ fileId: attachment.fileId }).delete();
  await db.orm.public.FileObject.where({ id: attachment.fileId }).delete();
  await storage.deleteObject(objectKey);

  console.log("files self-check passed");
}

main()
  .catch((error) => {
    console.error("files self-check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
