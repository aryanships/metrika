import "dotenv/config";
import { createHash, createHmac } from "node:crypto";
import { env } from "../lib/env";

/**
 * Configures the CORS policy on the R2 bucket so the browser can upload
 * directly to presigned URLs without being blocked by CORS.
 *
 * Run once (or whenever the policy changes):
 *   bun run r2:cors
 *
 * Requires R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (and R2_BUCKET)
 * to be set in .env. The policy allows GET/PUT/HEAD/DELETE from any origin.
 */

const CORS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Type</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const { endpoint, bucket, accessKeyId, secretAccessKey, region } = env.r2;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  }

  const method = "PUT";
  const host = new URL(endpoint).host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const payloadHash = sha256Hex(CORS_XML);

  const canonicalUri = `/${bucket}`;
  const canonicalQuery = "cors=";
  const canonicalHeaders = [
    `content-type:application/xml`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `${endpoint}/${bucket}?cors`;
  const res = await fetch(url, {
    method,
    headers: {
      authorization,
      "content-type": "application/xml",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body: CORS_XML,
  });

  if (!res.ok) {
    throw new Error(`PutBucketCors failed: HTTP ${res.status} ${await res.text()}`);
  }

  console.log(`CORS policy configured for bucket "${bucket}".`);
}

main().catch((error) => {
  console.error("R2 CORS configuration failed:", error);
  process.exit(1);
});
