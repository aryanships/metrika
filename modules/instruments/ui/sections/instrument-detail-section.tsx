"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { formatDate } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { InstrumentStatusBadge } from "../components/instrument-status-badge";
import { CertificateStatusBadge } from "@/modules/certificates/ui/components/certificate-status-badge";
import { ApplicationStatusBadge } from "@/modules/applications/ui/components/application-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentList } from "@/components/attachment-list";
import type { CertificateStatus } from "@/modules/certificates/schema";
import type { ApplicationStatus } from "@/modules/applications/schema";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export function InstrumentDetailSection({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<InstrumentDetailSkeleton />}>
      <QueryErrorBoundary>
        <InstrumentDetailContent id={id} />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function InstrumentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function InstrumentDetailContent({ id }: { id: string }) {
  const { data } = useSuspenseQuery(orpc.instruments.passport.queryOptions({ input: { id } }));

  const { instrument, certificates, applications } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{instrument.instrumentCode}</h1>
          <InstrumentStatusBadge status={instrument.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {instrument.instrumentTypeName} · {instrument.manufacturer} {instrument.model}
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row label="Manufacturer" value={instrument.manufacturer} />
            <Row label="Model" value={instrument.model} />
            <Row label="Serial number" value={instrument.serialNumber} />
            <Row label="Capacity" value={instrument.capacity ? `${instrument.capacity} ${instrument.instrumentTypeUnit}` : null} />
            <Row label="Accuracy class" value={instrument.accuracyClass} />
            <Row label="Year of manufacture" value={instrument.yearOfManufacture} />
            <Row label="Purchase date" value={instrument.purchaseDate ? formatDate(instrument.purchaseDate) : null} />
            <Row label="Location" value={instrument.address} />
            <Row label="Administrative unit" value={instrument.administrativeUnitName} />
            <Row label="Postal code" value={instrument.postalCode} />
          </dl>
          {data.activeCertificate && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Active certificate</h3>
              <Link
                href={`/business/certificates/${data.activeCertificate.id}`}
                className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{data.activeCertificate.certificateCode}</span>
                  <span className="text-xs text-muted-foreground">Valid until {formatDate(data.activeCertificate.validUntil)}</span>
                </div>
                <CertificateStatusBadge status={data.activeCertificate.status as CertificateStatus} />
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="pt-4">
          {certificates.length > 0 ? (
            <div className="flex flex-col gap-2">
              {certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/business/certificates/${cert.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-medium">{cert.certificateCode}</span>
                    <span className="text-xs text-muted-foreground">Valid until {formatDate(cert.validUntil)}</span>
                  </div>
                  <CertificateStatusBadge status={cert.status as CertificateStatus} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
          )}
        </TabsContent>

        <TabsContent value="applications" className="pt-4">
          {applications.length > 0 ? (
            <div className="flex flex-col gap-2">
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/business/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-medium">{app.applicationCode}</span>
                    <span className="text-xs capitalize text-muted-foreground">{app.type.toLowerCase().replaceAll("_", " ")}</span>
                  </div>
                  <ApplicationStatusBadge status={app.status as ApplicationStatus} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          )}
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <AttachmentList target={{ instrumentId: id }} emptyTitle="No documents uploaded" />
        </TabsContent>

        <TabsContent value="photos" className="pt-4">
          <AttachmentList target={{ instrumentId: id }} photosOnly emptyTitle="No photos uploaded" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
