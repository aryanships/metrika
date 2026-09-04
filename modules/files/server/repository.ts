/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `files` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/files/server/service.ts` or procedures.
 */
import { db } from "@/prisma/db";
import type { AttachmentKind } from "../schema";

export type Orm = typeof db.orm;

export interface CreateFileInput {
  bucket: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string | null;
  metadata: null;
  uploadedById: string;
}

export interface CreateAttachmentInput {
  fileId: string;
  instrumentId: string | null;
  applicationId: string | null;
  inspectionId: string | null;
  kind: AttachmentKind;
  capturedAt: string | null;
  capturedById: string | null;
  latitude: string | null;
  longitude: string | null;
}

export const filesRepository = {
  createFile(data: CreateFileInput, orm: Orm = db.orm) {
    return orm.public.FileObject.create(data);
  },

  createAttachment(data: CreateAttachmentInput, orm: Orm = db.orm) {
    return orm.public.Attachment.create(data);
  },

  findFileById(id: string, orm: Orm = db.orm) {
    return orm.public.FileObject.first({ id });
  },

  findAttachmentByFileId(fileId: string, orm: Orm = db.orm) {
    return orm.public.Attachment.where({ fileId }).first();
  },
};
