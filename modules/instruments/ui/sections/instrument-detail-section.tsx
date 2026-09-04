"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { InstrumentStatusBadge } from "../components/instrument-status-badge";
import { CertificateStatusBadge } from "@/modules/certificates/ui/components/certificate-status-badge";
import type { CertificateStatus } from "@/modules/certificates/schema";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function InstrumentDetailSection({ id }: { id: string }) {
  const { data, isPending, error } = useQuery(orpc.instruments.passport.queryOptions({ input: { id } }));

  if (isPending) return <p className="text-sm text-muted-foreground">Loading instrument…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load instrument.</p>;
  if (!data) return null;

  const { instrument, certificates, applications } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{instrument.instrumentCode}</h1>
          <InstrumentStatusBadge status={instrument.status} />
        </div>
        <p className="text-sm text-muted-foreground">{instrument.instrumentTypeName}</p>
      </header>

      <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Row label="Manufacturer" value={instrument.manufacturer} />
        <Row label="Model" value={instrument.model} />
        <Row label="Serial number" value={instrument.serialNumber} />
        <Row label="Capacity" value={instrument.capacity ? `${instrument.capacity} ${instrument.instrumentTypeUnit}` : null} />
        <Row label="Accuracy class" value={instrument.accuracyClass} />
        <Row label="Year of manufacture" value={instrument.yearOfManufacture} />
        <Row label="Purchase date" value={instrument.purchaseDate} />
        <Row label="Location" value={instrument.address} />
        <Row label="Administrative unit" value={instrument.administrativeUnitName} />
        <Row label="Postal code" value={instrument.postalCode} />
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Verification history</h2>
        {certificates.length > 0 ? (
          <div className="flex flex-col gap-2">
            {certificates.map((cert) => (
              <Link
                key={cert.id}
                href={`/owner/certificates/${cert.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{cert.certificateCode}</span>
                  <span className="text-xs text-muted-foreground">
                    Valid until {formatDate(cert.validUntil)}
                  </span>
                </div>
                <CertificateStatusBadge status={cert.status as CertificateStatus} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Applications</h2>
        {applications.length > 0 ? (
          <div className="flex flex-col gap-2">
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{app.applicationCode}</span>
                  <span className="text-xs text-muted-foreground">{app.type.replaceAll("_", " ").toLowerCase()}</span>
                </div>
                <span className="text-xs font-medium">{app.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        )}
      </section>
    </div>
  );
}
