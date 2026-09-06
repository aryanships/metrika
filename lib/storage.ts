import { createHash, createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env, type StorageDriverName } from "@/lib/env";

/**
 * Provider-neutral object-storage adapter. It only ever deals in object keys,
 * never in the FileObject/Attachment database records — those belong to
 * modules/files.
 *
 * Two drivers, selected by STORAGE_DRIVER (defaults to "auto"):
 *   - "r2": S3-compatible presigned URLs (Cloudflare R2). Used in production.
 *   - "local": filesystem-backed, served through /uploads — so uploads work
 *     without any R2 credentials in development.
 *
 * SECURITY: signed URLs are time-limited and key-scoped; the local driver is
 * dev-only and never issues a permanent public URL.
 */

export interface StorageDriver {
  readonly driver: Exclude<StorageDriverName, "auto">;
  readonly bucket: string;
  createUploadUrl(key: string): { url: string; expiresAt: string };
  createDownloadUrl(key: string): { url: string; expiresAt: string };
  confirmObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null>;
  deleteObject(key: string): Promise<void>;
}

const UPLOAD_TTL_SECONDS = 15 * 60;
const DOWNLOAD_TTL_SECONDS = 30 * 60;

// ---------------------------------------------------------------------------
// Local (filesystem) driver
// ---------------------------------------------------------------------------

/** Directory that backs the local driver, also served by app/uploads/[...key]. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export function contentTypeFor(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

function localPath(key: string): string {
  const file = path.join(LOCAL_UPLOAD_DIR, key);
  const rel = path.relative(LOCAL_UPLOAD_DIR, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Object key escapes the upload directory");
  }
  return file;
}

function localUrl(key: string): string {
  return `/uploads/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function isMissing(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === "ENOENT";
}

const localDriver: StorageDriver = {
  driver: "local",
  bucket: "local",
  createUploadUrl(key) {
    return {
      url: localUrl(key),
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
    };
  },
  createDownloadUrl(key) {
    return {
      url: localUrl(key),
      expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString(),
    };
  },
  async confirmObject(key) {
    try {
      const stat = await fs.stat(localPath(key));
      return { sizeBytes: stat.size, contentType: contentTypeFor(key) };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  },
  async deleteObject(key) {
    try {
      await fs.unlink(localPath(key));
    } catch (err) {
      if (!isMissing(err)) throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// S3 / R2 driver (AWS Signature V4 presigned URLs)
// ---------------------------------------------------------------------------

interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/%7E/gi, "~");
}

function createS3Driver(cfg: S3Config): StorageDriver {
  function assertConfigured(): void {
    if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
      throw new Error(
        "Object storage is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
      );
    }
  }

  function presignUrl(method: string, key: string, expiresInSeconds: number): string {
    assertConfigured();

    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
    const credential = `${cfg.accessKeyId}/${scope}`;
    const host = new URL(cfg.endpoint).host;

    const canonicalUri = `/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

    const params: Array<[string, string]> = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", credential],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(expiresInSeconds)],
      ["X-Amz-SignedHeaders", "host"],
    ];
    const sorted = params.slice().sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const canonicalQuery = sorted
      .map(([k, v]) => `${encodeQuery(k)}=${encodeQuery(v)}`)
      .join("&");

    const canonicalHeaders = `host:${host}\n`;
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

    const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, cfg.region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = hmac(kSigning, stringToSign).toString("hex");

    const query = [...sorted, ["X-Amz-Signature", signature]]
      .map(([k, v]) => `${encodeQuery(k)}=${encodeQuery(v)}`)
      .join("&");

    return `${cfg.endpoint}/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}?${query}`;
  }

  return {
    driver: "r2",
    bucket: cfg.bucket,
    createUploadUrl(key) {
      return {
        url: presignUrl("PUT", key, UPLOAD_TTL_SECONDS),
        expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
      };
    },
    createDownloadUrl(key) {
      return {
        url: presignUrl("GET", key, DOWNLOAD_TTL_SECONDS),
        expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString(),
      };
    },
    async confirmObject(key) {
      assertConfigured();
      const res = await fetch(presignUrl("HEAD", key, 60), { method: "HEAD" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Object check failed (HTTP ${res.status})`);
      const contentLength = Number(res.headers.get("content-length") ?? "0");
      return {
        sizeBytes: Number.isFinite(contentLength) ? contentLength : 0,
        contentType: res.headers.get("content-type"),
      };
    },
    async deleteObject(key) {
      assertConfigured();
      const res = await fetch(presignUrl("DELETE", key, 60), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Object delete failed (HTTP ${res.status})`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function selectDriver(): StorageDriver {
  if (env.storageDriver === "local") return localDriver;
  if (env.storageDriver === "r2") return createS3Driver(env.r2);
  return env.r2.configured ? createS3Driver(env.r2) : localDriver;
}

export const storage: StorageDriver = selectDriver();
