"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AttachmentList } from "@/components/attachment-list";
import { ApplicationStatusBadge } from "../components/application-status-badge";
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

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export function FieldApplicationDetailSection({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(orpc.applications.detail.queryOptions({ input: { id } }));

  const issue = useMutation(
    orpc.certificates.issue.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
        queryClient.invalidateQueries({ queryKey: orpc.certificates.key() });
      },
    }),
  );

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading application…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load application.</p>;
  if (!query.data) return null;

  const { application, instrument, appointment, priorCertificates, contactPhone, contactEmail, businessName, statusHistory } = query.data;
  const status = application.status;

  const startable = status === "SCHEDULED";
  const resumable = status === "VERIFICATION_IN_PROGRESS";
  const issuable = status === "PASSED";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{application.applicationCode}</h1>
          <ApplicationStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{humanize(application.type)}</span> ·{" "}
          <span className="font-mono">{instrument.instrumentCode}</span>
        </p>
      </header>

      {issue.isError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{describeError(issue.error)}</p>
      )}
      {issue.isSuccess && issue.data && (
        <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          Certificate <span className="font-mono">{issue.data.certificateCode}</span> issued.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Instrument</h2>
        <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Instrument code" value={<span className="font-mono">{instrument.instrumentCode}</span>} />
          <Row label="Serial number" value={<span className="font-mono">{instrument.serialNumber}</span>} />
          <Row label="Type" value={instrument.instrumentTypeName} />
          <Row label="Manufacturer" value={instrument.manufacturer} />
          <Row label="Model" value={instrument.model} />
          <Row label="Capacity" value={instrument.capacity ? `${instrument.capacity} ${instrument.instrumentTypeUnit}` : null} />
          <Row label="Accuracy class" value={instrument.accuracyClass} />
          <Row label="Installation address" value={instrument.address} />
          <Row label="Administrative unit" value={instrument.administrativeUnitName} />
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Appointment</h2>
        <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <Row label="Start" value={appointment.scheduledStartAt ? formatDateTime(appointment.scheduledStartAt) : null} />
          <Row label="End" value={appointment.scheduledEndAt ? formatDateTime(appointment.scheduledEndAt) : null} />
          <Row label="Location" value={appointment.location} />
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Owner contact</h2>
        <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <Row label="Business" value={businessName} />
          <Row label="Phone" value={contactPhone} />
          <Row label="Email" value={contactEmail} />
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Prior certificates</h2>
        {priorCertificates.length > 0 ? (
          <div className="flex flex-col gap-2">
            {priorCertificates.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{c.certificateCode}</span>
                  <span className="text-xs text-muted-foreground">
                    Verified {formatDateTime(c.verifiedAt)} · valid until {formatDateTime(c.validUntil)}
                  </span>
                </div>
                <CertificateStatusBadge status={c.status as CertificateStatus} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No prior certificates.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Documents</h2>
        <AttachmentList target={{ applicationId: id }} emptyTitle="No documents uploaded" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Status history</h2>
        {statusHistory.length > 0 ? (
          <ol className="flex flex-col">
            {statusHistory.map((h) => (
              <li key={h.id} className="relative flex gap-3 border-l border-border pb-4 pl-4 last:pb-0">
                <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{humanize(h.toStatus)}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.fromStatus ? `from ${humanize(h.fromStatus)} · ` : ""}
                    {formatDateTime(h.createdAt)}
                  </p>
                  {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No status changes yet.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {(startable || resumable) && (
          <Link href={`/field/applications/${id}/inspect`}>
            <Button>{startable ? "Start verification" : "Resume inspection"}</Button>
          </Link>
        )}
        {issuable && (
          <Button disabled={issue.isPending} onClick={() => issue.mutate({ applicationId: id })}>
            {issue.isPending ? "Issuing…" : "Issue certificate"}
          </Button>
        )}
      </div>
    </div>
  );
}
