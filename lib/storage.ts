import { createHash, createHmac } from "node:crypto";

/**
 * Provider-neutral object-storage adapter backed by any S3-compatible API
 * (Cloudflare R2 here). It only ever deals in object keys, never in the
 * FileObject/Attachment database records — those belong to modules/files.
 *
 * SECURITY: the signed URLs produced here are time-limited and key-scoped.
 * Never issue a permanent public URL.
 */

const endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/+$/, "");
const bucket = process.env.R2_BUCKET ?? "metrika";
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const region = process.env.R2_REGION ?? "auto";

const UPLOAD_TTL_SECONDS = 15 * 60;
const DOWNLOAD_TTL_SECONDS = 30 * 60;

function assertConfigured(): void {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Object storage is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  }
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/%7E/gi, "~");
}

/**
 * AWS Signature Version 4 presigned URL (query-string auth, `UNSIGNED-PAYLOAD`).
 * R2 is S3-compatible and accepts region `auto`.
 */
function presignUrl(method: string, key: string, expiresInSeconds: number): string {
  assertConfigured();

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${scope}`;
  const host = new URL(endpoint).host;

  const canonicalUri = `/${bucket}/${key.split("/").map(encodePathSegment).join("/")}`;

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
  const signedHeaders = "host";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const query = [...sorted, ["X-Amz-Signature", signature]]
    .map(([k, v]) => `${encodeQuery(k)}=${encodeQuery(v)}`)
    .join("&");

  return `${endpoint}/${bucket}/${key.split("/").map(encodePathSegment).join("/")}?${query}`;
}

export const storage = {
  bucket,

  createUploadUrl(key: string): { url: string; expiresAt: string } {
    const expiresInSeconds = UPLOAD_TTL_SECONDS;
    return {
      url: presignUrl("PUT", key, expiresInSeconds),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  },

  createDownloadUrl(key: string): { url: string; expiresAt: string } {
    const expiresInSeconds = DOWNLOAD_TTL_SECONDS;
    return {
      url: presignUrl("GET", key, expiresInSeconds),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  },

  async confirmObject(
    key: string,
  ): Promise<{ sizeBytes: number; contentType: string | null } | null> {
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

  async deleteObject(key: string): Promise<void> {
    assertConfigured();
    const res = await fetch(presignUrl("DELETE", key, 60), { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Object delete failed (HTTP ${res.status})`);
    }
  },
};
