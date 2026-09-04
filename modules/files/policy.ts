import type { AttachmentKind, AttachmentTargetType } from "./schema";

/**
 * File policy: which MIME types, sizes, and attachment kinds are permitted for
 * each attachment target. Kept data-driven so the demo can widen a rule in one
 * place without touching the upload flow.
 */

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [...PHOTO_TYPES, "application/pdf"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const KINDS_BY_TARGET: Record<AttachmentTargetType, readonly AttachmentKind[]> = {
  instrument: [
    "PREVIOUS_CERTIFICATE",
    "PURCHASE_DOCUMENT",
    "APPROVAL_DOCUMENT",
    "INSTRUMENT_FRONT",
    "SERIAL_NUMBER",
    "NAMEPLATE",
    "CONDITION",
    "OTHER",
  ],
  application: [
    "PREVIOUS_CERTIFICATE",
    "APPROVAL_DOCUMENT",
    "CERTIFICATE_CORRECTION_EVIDENCE",
    "OTHER",
  ],
  inspection: [
    "INSTRUMENT_FRONT",
    "SERIAL_NUMBER",
    "NAMEPLATE",
    "VERIFICATION_AREA",
    "TEST_SETUP",
    "INSPECTION_VIDEO",
    "INSPECTION_REPORT",
    "OTHER",
  ],
};

const PHOTO_KINDS: readonly AttachmentKind[] = [
  "INSTRUMENT_FRONT",
  "SERIAL_NUMBER",
  "NAMEPLATE",
  "CONDITION",
  "VERIFICATION_AREA",
  "TEST_SETUP",
];

export function allowedContentTypes(kind: AttachmentKind): readonly string[] {
  if (kind === "INSPECTION_VIDEO") return VIDEO_TYPES;
  if ((PHOTO_KINDS as readonly string[]).includes(kind)) return PHOTO_TYPES;
  return DOCUMENT_TYPES;
}

export function maxSizeBytes(kind: AttachmentKind): number {
  if (kind === "INSPECTION_VIDEO") return 100 * 1024 * 1024;
  if ((PHOTO_KINDS as readonly string[]).includes(kind)) return 10 * 1024 * 1024;
  return 20 * 1024 * 1024;
}

export function isKindAllowedOnTarget(kind: AttachmentKind, targetType: AttachmentTargetType): boolean {
  return (KINDS_BY_TARGET[targetType] as readonly string[]).includes(kind);
}

export function sanitizeFileName(name: string): string {
  const sanitized = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(-120);
  return sanitized || "file";
}
