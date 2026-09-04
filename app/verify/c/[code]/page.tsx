import { headers } from "next/headers";
import { verificationService } from "@/modules/verification/server/service";
import { getClientIp } from "@/middleware/context";
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
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Certificate not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No verification record matches &quot;{code}&quot;. Check the code and try again.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Prototype / Demo Certificate
      </p>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={`px-6 py-5 text-sm font-semibold text-primary-foreground ${
            result.valid ? "bg-primary" : "bg-destructive"
          }`}
        >
          {result.valid ? "Certificate verified" : "Certificate not currently valid"}
        </div>

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
        This is a prototype verification record for a demonstration. It is not a government-issued legal
        certificate.
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
