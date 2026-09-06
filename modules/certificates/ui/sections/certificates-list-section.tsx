"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { CertificateStatusBadge } from "../components/certificate-status-badge";
import type { CertificateOutput } from "../../schema";

export function CertificatesListSection() {
  return (
    <Suspense fallback={<CertificatesListSkeleton />}>
      <QueryErrorBoundary>
        <CertificatesListContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function CertificatesListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
      ))}
    </div>
  );
}

function CertificatesListContent() {
  const { data } = useSuspenseQuery(
    orpc.certificates.listMine.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((certificate) => (
        <CertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </div>
  );
}

function CertificateCard({ certificate }: { certificate: CertificateOutput }) {
  return (
    <Link
      href={`/business/certificates/${certificate.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{certificate.certificateCode}</span>
        <CertificateStatusBadge status={certificate.status} />
      </div>
      <p className="text-sm font-medium">{certificate.instrument.typeName}</p>
      <p className="text-xs text-muted-foreground">
        {certificate.instrument.manufacturer} · {certificate.instrument.model}
      </p>
      <p className="mt-auto text-xs text-muted-foreground">
        Valid until {new Date(certificate.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </Link>
  );
}
