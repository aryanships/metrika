import "dotenv/config";

/**
 * Single source of truth for process environment configuration.
 * Server-only: never import this from a client component or a route that ships
 * to the browser. No secret is ever exposed via `NEXT_PUBLIC_*`.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const r2Endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/+$/, "");
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";

export type StorageDriverName = "auto" | "local" | "r2";

export const env = {
  databaseUrl: required("DATABASE_URL"),
  authSecret: required("AUTH_SECRET"),
  /**
   * Object storage. R2 is optional in development: when it is not configured
   * (or STORAGE_DRIVER=local) uploads fall back to the local filesystem
   * adapter in `lib/storage.ts`.
   */
  r2: {
    endpoint: r2Endpoint,
    bucket: process.env.R2_BUCKET ?? "metrika",
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    region: process.env.R2_REGION ?? "auto",
    get configured(): boolean {
      return Boolean(r2Endpoint && r2AccessKeyId && r2SecretAccessKey);
    },
  },
  storageDriver: (process.env.STORAGE_DRIVER ?? "auto") as StorageDriverName,
};
