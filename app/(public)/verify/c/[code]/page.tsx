import Link from "next/link";
import { headers } from "next/headers";
import { ShieldCheckIcon, ShieldXIcon, TriangleAlertIcon } from "lucide-react";
import { verificationService } from "@/modules/verification/server/service";
import { getClientIp } from "@/middleware/context";
import { Badge } from "@/components/ui/badge";
import type { PublicVerificationOutput } from "@/modules/verification/schema";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = getClientIp(await headers());

  let result: PublicVerificationOutput | null = null;
  try {
    result = await verificationService.verifyCertificate({ certificateCode: code }, ip ?? undefined);
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
        <Link href="/" className="mb-8 self-center text-sm font-semibold">
          Digital Metrology
        </Link>
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <ShieldXIcon className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Certificate not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No verification record matches &quot;{code}&quot;. Check the code and try again.
          </p>
          <Link href="/verify" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Try another code
          </Link>
        </section>
      </main>
    );
  }

  const StatusIcon = result.valid ? ShieldCheckIcon : ShieldXIcon;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 self-center text-sm font-semibold">
        Digital Metrology
      </Link>

      <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Prototype / Demo Certificate
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={`flex items-center justify-between gap-2 px-6 py-5 ${
            result.valid ? "bg-emerald-600" : "bg-destructive"
          } text-primary-foreground`}
        >
          <span className="text-sm font-semibold">
            {result.valid ? "Certificate verified" : "Certificate not currently valid"}
          </span>
          <Badge variant={result.valid ? "secondary" : "destructive"} className="bg-background/20 text-primary-foreground">
            <StatusIcon className="size-3" />
            {result.status}
          </Badge>
        </div>

        {result.integrity.tamperDetected ? (
          <div className="flex items-center gap-2 border-b border-border bg-destructive/10 px-6 py-3 text-xs text-destructive">
            <TriangleAlertIcon className="size-4" />
            Data mismatch — the presented document does not match the official record.
          </div>
        ) : null}

        <dl className="grid gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-2">
          <Field label="Certificate" value={result.certificateCode} mono />
          <Field label="Status" value={result.status} />
          <Field label="Instrument" value={result.instrument.code} mono />
          <Field label="Category" value={result.instrument.category} />
          <Field label="Manufacturer" value={result.instrument.manufacturer} />
          <Field label="Model" value={result.instrument.model} />
          <Field label="Serial number" value={result.instrument.serialNumber} />
          <Field
            label="Capacity"
            value={
              result.instrument.capacity
                ? `${result.instrument.capacity} ${result.instrument.capacityUnit ?? ""}`.trim()
                : "—"
            }
          />
          <Field label="Verified" value={formatDate(result.verifiedAt)} />
          <Field label="Valid until" value={formatDate(result.validUntil)} />
          <Field label="Issuing authority" value={result.issuingAuthority} />
          <Field label="Accuracy class" value={result.instrument.accuracyClass ?? "—"} />
        </dl>

        <footer className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
          <span>Integrity: {result.integrity.isHashVerified ? "hash verified" : "unverified"}</span>
          <span>Checked {formatDate(result.verificationTimestamp)}</span>
        </footer>
      </section>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        This is a prototype verification record for a demonstration. It is not a government-issued
        legal certificate.
      </p>
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
