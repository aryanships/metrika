import { promises as fs } from "node:fs";
import path from "node:path";
import { contentTypeFor, LOCAL_UPLOAD_DIR, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Local storage adapter endpoint. Only active when the local driver is
 * selected (dev without R2); otherwise every request 404s so the route is
 * inert in production.
 */

type Params = { params: Promise<{ key: string[] }> };

function resolve(key: string[]): string {
  const file = path.join(LOCAL_UPLOAD_DIR, ...key);
  const rel = path.relative(LOCAL_UPLOAD_DIR, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Object key escapes the upload directory");
  }
  return file;
}

export async function PUT(request: Request, { params }: Params) {
  if (storage.driver !== "local") return new Response("Not found", { status: 404 });
  const { key } = await params;
  const file = resolve(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await request.arrayBuffer()));
  return new Response(null, { status: 204 });
}

export async function GET(_request: Request, { params }: Params) {
  if (storage.driver !== "local") return new Response("Not found", { status: 404 });
  const { key } = await params;
  let body: Buffer;
  try {
    body = await fs.readFile(resolve(key));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": contentTypeFor(key.join("/")),
      "content-length": String(body.length),
      "cache-control": "private, max-age=3600",
    },
  });
}
