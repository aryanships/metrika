"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { formatDate } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { CertificateStatusBadge } from "../components/certificate-status-badge";

export function FieldCertificatesSection() {
  return (
    <Suspense fallback={<FieldCertificatesSkeleton />}>
      <QueryErrorBoundary>
        <FieldCertificatesContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function FieldCertificatesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function FieldCertificatesContent() {
  const { data } = useSuspenseQuery(
    orpc.certificates.listField.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  const certificates = data.items;

  if (certificates.length === 0) {
    return <p className="text-sm text-muted-foreground">No certificates issued by you yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {certificates.map((c) => (
        <Link
          key={c.id}
          href={`/field/applications/${c.applicationId}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-medium">{c.certificateCode}</span>
            <span className="text-xs text-muted-foreground">
              {c.instrument.code} · {c.instrument.typeName} · {c.businessName}
            </span>
            <span className="text-xs text-muted-foreground">Valid until {formatDate(c.validUntil)}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <CertificateStatusBadge status={c.status} />
            <Link href={c.qrUrl} className="text-xs font-medium text-primary hover:underline">
              Public view
            </Link>
          </div>
        </Link>
      ))}
    </div>
  );
}
