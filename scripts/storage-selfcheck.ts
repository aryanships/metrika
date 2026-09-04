import "dotenv/config";
import { storage } from "../lib/storage";

const key = `selfcheck/${crypto.randomUUID()}.txt`;
const body = "metrika storage self-check";

async function main(): Promise<void> {
  const upload = storage.createUploadUrl(key);
  const put = await fetch(upload.url, {
    method: "PUT",
    headers: { "content-type": "text/plain" },
    body,
  });
  if (!put.ok) throw new Error(`PUT failed: HTTP ${put.status} ${await put.text()}`);

  const info = await storage.confirmObject(key);
  if (!info) throw new Error("HEAD returned null for an object that was just uploaded");
  if (info.sizeBytes !== Buffer.byteLength(body)) {
    throw new Error(`HEAD size mismatch: ${info.sizeBytes}`);
  }

  const download = storage.createDownloadUrl(key);
  const got = await fetch(download.url);
  if (!got.ok) throw new Error(`GET failed: HTTP ${got.status}`);
  const text = await got.text();
  if (text !== body) throw new Error(`GET content mismatch: "${text}"`);

  await storage.deleteObject(key);
  if ((await storage.confirmObject(key)) !== null) {
    throw new Error("DELETE did not remove the object");
  }

  console.log("storage self-check passed");
}

main().catch((error) => {
  console.error("storage self-check failed:", error);
  process.exit(1);
});
