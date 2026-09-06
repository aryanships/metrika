import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { storage } from "@/lib/storage";
import { env } from "@/lib/env";
import { requireStateScope } from "@/middleware/require-state-scope";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import { filesRepository } from "./repository";
import {
  allowedContentTypes,
  isKindAllowedOnTarget,
  maxSizeBytes,
  sanitizeFileName,
} from "../policy";
import {
  AttachmentKind,
  AttachmentOutput,
  AttachmentTarget,
  AttachmentTargetType,
  ConfirmUploadInput,
  CreateUploadIntentInput,
  DownloadUrlOutput,
  GetDownloadUrlInput,
  UploadIntentOutput,
} from "../schema";

const TOKEN_TTL_SECONDS = 15 * 60;
const ADMIN_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"];
const SCOPED_ADMIN_ROLES: readonly UserRole[] = ["STATE_ADMIN", "DISTRICT_ADMIN"];

function notFound(resourceType: string, resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType, resourceId } });
}

function forbidden(reason: string): never {
  throw new ORPCError("FORBIDDEN", { data: { reason } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

function unauthorized(message = "Invalid or expired upload token"): never {
  throw new ORPCError("UNAUTHORIZED", { message });
}

function targetType(target: AttachmentTarget): AttachmentTargetType {
  if (target.instrumentId) return "instrument";
  if (target.applicationId) return "application";
  return "inspection";
}

function targetId(target: AttachmentTarget): string {
  return target.instrumentId ?? target.applicationId ?? target.inspectionId!;
}

async function resolveTargetContext(target: AttachmentTarget): Promise<{
  businessId: string;
  administrativeUnitId: string | null;
  applicationId: string | null;
}> {
  if (target.instrumentId) {
    const instrument = await db.orm.public.Instrument.first({ id: target.instrumentId });
    if (!instrument) notFound("Instrument", target.instrumentId);
    return {
      businessId: instrument.businessId,
      administrativeUnitId: instrument.administrativeUnitId,
      applicationId: null,
    };
  }
  if (target.applicationId) {
    const application = await db.orm.public.Application.first({ id: target.applicationId });
    if (!application) notFound("Application", target.applicationId);
    const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
    if (!instrument) notFound("Instrument", application.instrumentId);
    return {
      businessId: instrument.businessId,
      administrativeUnitId: instrument.administrativeUnitId,
      applicationId: application.id,
    };
  }
  const inspection = await db.orm.public.Inspection.first({ id: targetId(target) });
  if (!inspection) notFound("Inspection", targetId(target));
  const application = await db.orm.public.Application.first({ id: inspection.applicationId });
  if (!application) notFound("Application", inspection.applicationId);
  const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
  if (!instrument) notFound("Instrument", application.instrumentId);
  return {
    businessId: instrument.businessId,
    administrativeUnitId: instrument.administrativeUnitId,
    applicationId: application.id,
  };
}

async function hasActiveMembership(userId: string, gatcId: string): Promise<boolean> {
  const membership = await db.orm.public.GatcMembership.where({ userId, gatcId }).first();
  return !!membership && membership.isActive;
}

async function assertAssignedStaff(
  user: AppUser,
  target: AttachmentTarget,
  applicationId: string | null,
): Promise<void> {
  const lmo = user.roles.includes("LMO")
    ? await db.orm.public.Lmo.where({ userId: user.id, isActive: true }).first()
    : null;

  if (target.inspectionId) {
    const inspection = await db.orm.public.Inspection.first({ id: target.inspectionId });
    if (inspection) {
      if (inspection.performedById === user.id) return;
      if (lmo && inspection.lmoId === lmo.id) return;
      if (inspection.gatcId && (await hasActiveMembership(user.id, inspection.gatcId))) return;
    }
  }

  if (applicationId) {
    const workOrder = await db.orm.public.WorkOrder.where({ applicationId }).first();
    if (workOrder) {
      if (lmo && workOrder.lmoId === lmo.id) return;
      if (workOrder.gatcId && (await hasActiveMembership(user.id, workOrder.gatcId))) return;
    }
  }

  forbidden("Not assigned to this work");
}

async function assertCanAccessTarget(user: AppUser, target: AttachmentTarget): Promise<void> {
  const ctx = await resolveTargetContext(target);

  if (user.roles.includes("INSTRUMENT_OWNER")) {
    if (user.businessId !== ctx.businessId) forbidden("Resource does not belong to your business");
    return;
  }
  if (ADMIN_ROLES.some((role) => user.roles.includes(role))) return;
  if (SCOPED_ADMIN_ROLES.some((role) => user.roles.includes(role))) {
    if (ctx.administrativeUnitId) await requireStateScope(user, ctx.administrativeUnitId);
    return;
  }
  await assertAssignedStaff(user, target, ctx.applicationId);
}

function authSecret(): string {
  return env.authSecret;
}

function b64url(data: string | Buffer): string {
  return Buffer.isBuffer(data)
    ? data.toString("base64url")
    : Buffer.from(data, "utf8").toString("base64url");
}

interface UploadTokenPayload {
  objectKey: string;
  kind: AttachmentKind;
  instrumentId?: string;
  applicationId?: string;
  inspectionId?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  capturedAt?: string;
  latitude?: string;
  longitude?: string;
  uid: string;
  exp: number;
}

function signToken(payload: UploadTokenPayload): string {
  const json = JSON.stringify(payload);
  return `${b64url(json)}.${b64url(createHmac("sha256", authSecret()).update(json).digest())}`;
}

function verifyToken(token: string): UploadTokenPayload {
  const [body, signature] = token.split(".");
  if (!body || !signature) unauthorized();

  const json = Buffer.from(body, "base64url").toString("utf8");
  const expected = createHmac("sha256", authSecret()).update(json).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) unauthorized();

  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(json);
  } catch {
    unauthorized();
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    unauthorized("Upload token has expired");
  }
  return payload;
}

function toAttachmentOutput(
  attachment: Awaited<ReturnType<typeof filesRepository.createAttachment>>,
  file: Awaited<ReturnType<typeof filesRepository.createFile>>,
): AttachmentOutput {
  return {
    id: attachment.id,
    fileId: file.id,
    kind: attachment.kind,
    instrumentId: attachment.instrumentId,
    applicationId: attachment.applicationId,
    inspectionId: attachment.inspectionId,
    fileName: file.fileName,
    contentType: file.mimeType,
    sizeBytes: file.sizeBytes,
    capturedAt: attachment.capturedAt,
    latitude: attachment.latitude,
    longitude: attachment.longitude,
    createdAt: attachment.createdAt,
  };
}

export const filesService = {
  async createUploadIntent(input: CreateUploadIntentInput, user: AppUser): Promise<UploadIntentOutput> {
    const type = targetType(input.target);
    if (!isKindAllowedOnTarget(input.kind, type)) {
      validation("kind", `${input.kind} is not valid for a ${type}`);
    }
    if (!allowedContentTypes(input.kind).includes(input.contentType)) {
      validation("contentType", `${input.contentType} is not allowed for ${input.kind}`);
    }
    const maxBytes = maxSizeBytes(input.kind);
    if (input.sizeBytes > maxBytes) {
      validation("sizeBytes", `File exceeds the ${maxBytes} byte limit for ${input.kind}`);
    }

    await assertCanAccessTarget(user, input.target);

    const fileName = sanitizeFileName(input.fileName);
    const objectKey = `${type}/${input.kind.toLowerCase()}/${randomUUID()}/${fileName}`;

    const token = signToken({
      objectKey,
      kind: input.kind,
      instrumentId: input.target.instrumentId,
      applicationId: input.target.applicationId,
      inspectionId: input.target.inspectionId,
      fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      capturedAt: input.capturedAt,
      latitude: input.latitude,
      longitude: input.longitude,
      uid: user.id,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    });

    const { url, expiresAt } = storage.createUploadUrl(objectKey);
    return { uploadUrl: url, uploadToken: token, expiresAt, maxSizeBytes: maxBytes };
  },

  async confirmUpload(input: ConfirmUploadInput, user: AppUser): Promise<AttachmentOutput> {
    const token = verifyToken(input.uploadToken);
    if (token.uid !== user.id) forbidden("Upload token was issued for another user");

    const target: AttachmentTarget = {
      instrumentId: token.instrumentId,
      applicationId: token.applicationId,
      inspectionId: token.inspectionId,
    };
    await assertCanAccessTarget(user, target);

    const existing = await db.orm.public.FileObject.where({ objectKey: token.objectKey }).first();
    if (existing) conflict("uploadToken", "Upload has already been confirmed");

    const info = await storage.confirmObject(token.objectKey);
    if (!info) validation("uploadToken", "Object not found in storage — upload may not have completed");
    if (info.sizeBytes !== token.sizeBytes) {
      validation("sizeBytes", `Stored size (${info.sizeBytes}) does not match the declared size (${token.sizeBytes})`);
    }
    if (
      info.contentType &&
      info.contentType !== "application/octet-stream" &&
      info.contentType !== token.contentType
    ) {
      validation("contentType", `Stored content type (${info.contentType}) does not match the declared type (${token.contentType})`);
    }

    const created = await db.transaction(async (tx) => {
      const file = await filesRepository.createFile(
        {
          bucket: storage.bucket,
          objectKey: token.objectKey,
          fileName: token.fileName,
          mimeType: token.contentType,
          sizeBytes: info.sizeBytes,
          sha256: null,
          metadata: null,
          uploadedById: user.id,
        },
        tx.orm,
      );
      const attachment = await filesRepository.createAttachment(
        {
          fileId: file.id,
          instrumentId: target.instrumentId ?? null,
          applicationId: target.applicationId ?? null,
          inspectionId: target.inspectionId ?? null,
          kind: token.kind,
          capturedAt: token.capturedAt ?? null,
          capturedById: user.id,
          latitude: token.latitude ?? null,
          longitude: token.longitude ?? null,
        },
        tx.orm,
      );
      return { file, attachment };
    });

    return toAttachmentOutput(created.attachment, created.file);
  },

  async getDownloadUrl(input: GetDownloadUrlInput, user: AppUser): Promise<DownloadUrlOutput> {
    const file = await filesRepository.findFileById(input.fileId);
    if (!file) notFound("File", input.fileId);

    const attachment = await filesRepository.findAttachmentByFileId(file.id);
    if (!attachment) notFound("Attachment", input.fileId);

    const target: AttachmentTarget = {
      instrumentId: attachment.instrumentId ?? undefined,
      applicationId: attachment.applicationId ?? undefined,
      inspectionId: attachment.inspectionId ?? undefined,
    };
    await assertCanAccessTarget(user, target);

    const { url, expiresAt } = storage.createDownloadUrl(file.objectKey);
    return { downloadUrl: url, expiresAt, fileName: file.fileName, contentType: file.mimeType };
  },

  async listAttachments(target: AttachmentTarget, user: AppUser): Promise<AttachmentOutput[]> {
    await assertCanAccessTarget(user, target);

    const id = targetId(target);
    let query = db.orm.public.Attachment;
    if (target.instrumentId) query = query.where({ instrumentId: id });
    else if (target.applicationId) query = query.where({ applicationId: id });
    else query = query.where({ inspectionId: id });

    const attachments = await query.orderBy((a) => a.createdAt.desc()).all();
    if (attachments.length === 0) return [];

    const fileIds = attachments.map((a) => a.fileId);
    const files = await db.orm.public.FileObject.where((f) => f.id.in(fileIds)).all();
    const fileById = new Map(files.map((f) => [f.id, f]));

    return attachments
      .map((attachment) => {
        const file = fileById.get(attachment.fileId);
        return file ? toAttachmentOutput(attachment, file) : null;
      })
      .filter((output): output is AttachmentOutput => output !== null);
  },
};
