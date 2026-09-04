"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { CertificateStatusBadge } from "../components/certificate-status-badge";
import type { CertificateOutput } from "../../schema";

function CertificateCard({ certificate }: { certificate: CertificateOutput }) {
  return (
    <Link
      href={`/owner/certificates/${certificate.id}`}
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

export function CertificatesListSection() {
  const { data, isPending, error } = useQuery(
    orpc.certificates.listMine.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  if (isPending) return <p className="text-sm text-muted-foreground">Loading certificates…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load certificates.</p>;

  if (!data || data.items.length === 0) {
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
