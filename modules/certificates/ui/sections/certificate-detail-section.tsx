"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { CertificateStatusBadge } from "../components/certificate-status-badge";
import { CertificateQr } from "../components/certificate-qr";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export function CertificateDetailSection({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<CertificateDetailSkeleton />}>
      <QueryErrorBoundary>
        <CertificateDetailContent id={id} />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function CertificateDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function CertificateDetailContent({ id }: { id: string }) {
  const { data } = useSuspenseQuery(orpc.certificates.get.queryOptions({ input: { id } }));

  const { instrument } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Prototype / Demo Certificate
          </p>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold">{data.certificateCode}</h1>
            <CertificateStatusBadge status={data.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {(data.status === "EXPIRED" || data.status === "EXPIRING_SOON") && (
            <Link
              href={`/business/applications/new?instrumentId=${data.instrumentId}&type=RE_VERIFICATION`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply for re-verification
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Print / Save PDF
          </button>
        </div>
      </header>

      <section className="grid gap-8 rounded-xl border border-border bg-card p-6 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Issued to</p>
            <p className="text-lg font-semibold">{data.businessName}</p>
            <p className="text-xs text-muted-foreground">{data.issuingAuthority}</p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Instrument" value={instrument.code} mono />
            <Field label="Category" value={instrument.typeName} />
            <Field label="Manufacturer" value={instrument.manufacturer} />
            <Field label="Model" value={instrument.model} />
            <Field label="Serial number" value={instrument.serialNumber} />
            <Field
              label="Capacity"
              value={instrument.capacity ? `${instrument.capacity} ${instrument.unit}`.trim() : null}
            />
            <Field label="Accuracy class" value={instrument.accuracyClass} />
            <Field label="Verified" value={formatDate(data.verifiedAt)} />
            <Field label="Valid until" value={formatDate(data.validUntil)} />
            <Field label="Result" value="Pass" />
          </dl>

          <div className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="font-mono break-all">Hash: {data.payloadHash}</span>
            <span>This is a prototype certificate and is not legally binding.</span>
          </div>
        </div>

        <div className="flex flex-col justify-center print:hidden">
          <CertificateQr code={data.certificateCode} />
        </div>
      </section>
    </div>
  );
}
