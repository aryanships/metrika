import { headers } from "next/headers";
import { verificationService } from "@/modules/verification/server/service";
import { getClientIp } from "@/middleware/context";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = getClientIp(await headers());

  let result;
  try {
    result = await verificationService.verifyCertificate({ certificateCode: code }, ip ?? undefined);
  } catch {
    return new Response("Certificate not found", { status: 404 });
  }

  const pdf = await generateCertificatePdf(result);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${result.certificateCode}.pdf"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
