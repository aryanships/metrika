import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PublicVerificationOutput } from "@/modules/verification/schema";

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function cap(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

/** Render a public verification result as a single-page A4 PDF. */
export async function generateCertificatePdf(data: PublicVerificationOutput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.42, 0.42, 0.42);
  const green = rgb(0.04, 0.32, 0.18);
  const red = rgb(0.72, 0.16, 0.16);
  const line = rgb(0.85, 0.85, 0.85);

  const left = 56;
  const right = width - 56;
  const contentWidth = right - left;

  // Header band
  page.drawRectangle({ x: 0, y: height - 128, width, height: 128, color: green });
  page.drawText("DIGITAL METROLOGY", { x: left, y: height - 58, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Certificate of Verification", {
    x: left,
    y: height - 84,
    size: 24,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Prototype / demonstration record — not a government-issued certificate", {
    x: left,
    y: height - 106,
    size: 9,
    font,
    color: rgb(0.82, 0.94, 0.88),
  });

  let y = height - 168;

  page.drawText(`Certificate ${data.certificateCode}`, { x: left, y, size: 15, font: bold, color: ink });
  y -= 20;
  page.drawText(`Status: ${cap(data.status)}  ·  ${data.valid ? "VALID" : "NOT CURRENTLY VALID"}`, {
    x: left,
    y,
    size: 10,
    font: bold,
    color: data.valid ? green : red,
  });
  y -= 34;

  page.drawText("Issued to", { x: left, y, size: 9, font: bold, color: muted });
  y -= 17;
  page.drawText(data.businessName, { x: left, y, size: 16, font: bold, color: ink });
  y -= 19;
  page.drawText(data.issuingAuthority, { x: left, y, size: 10, font, color: muted });
  y -= 30;

  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 28;

  const rows: [string, string][] = [
    ["Instrument", data.instrument.code],
    ["Category", data.instrument.category],
    ["Manufacturer", data.instrument.manufacturer],
    ["Model", data.instrument.model],
    ["Serial number", data.instrument.serialNumber],
    [
      "Capacity",
      data.instrument.capacity ? `${data.instrument.capacity} ${data.instrument.capacityUnit ?? ""}`.trim() : "—",
    ],
    ["Accuracy class", data.instrument.accuracyClass ?? "—"],
    ["Result", "PASS"],
  ];

  const colW = contentWidth / 2;
  const rowH = 26;
  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? left : left + colW;
    const yy = y - row * rowH;
    page.drawText(label.toUpperCase(), { x, y: yy + 13, size: 7, font: bold, color: muted });
    page.drawText(value, { x, y: yy, size: 10, font, color: ink });
  });

  y -= Math.ceil(rows.length / 2) * rowH + 18;

  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 26;
  page.drawText(`Verified on: ${fmt(data.verifiedAt)}`, { x: left, y, size: 10, font, color: ink });
  y -= 16;
  page.drawText(`Valid until: ${fmt(data.validUntil)}`, { x: left, y, size: 10, font, color: ink });
  y -= 28;

  page.drawText(`Payload integrity: ${data.integrity.isHashVerified ? "hash verified" : "unverified"}`, {
    x: left,
    y,
    size: 9,
    font,
    color: data.integrity.tamperDetected ? red : muted,
  });
  y -= 16;
  page.drawText(`Verify this certificate online at /verify/c/${data.certificateCode}`, {
    x: left,
    y,
    size: 9,
    font,
    color: muted,
  });

  // Footer
  page.drawLine({ start: { x: left, y: 70 }, end: { x: right, y: 70 }, thickness: 1, color: line });
  page.drawText("This is a prototype verification record for demonstration purposes.", {
    x: left,
    y: 50,
    size: 8,
    font,
    color: muted,
  });

  return doc.save();
}
