"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AttachmentList } from "@/components/attachment-list";
import { FileUpload } from "@/components/file-upload";
import { StatusStepper } from "@/components/status-stepper";
import { ApplicationStatusBadge } from "../components/application-status-badge";
import type { ApplicationStatus } from "../../schema";
import type { AttachmentKind, AttachmentOutput } from "@/modules/files/schema";

const EDITABLE_STATUSES: ApplicationStatus[] = ["DRAFT", "DOCUMENTS_REQUIRED"];
const CANCELLABLE_STATUSES: ApplicationStatus[] = ["DRAFT", "SUBMITTED", "DOCUMENTS_REQUIRED"];

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

const JOURNEY = ["Submit", "Review", "Schedule", "Inspect", "Certify"];

function journeyIndex(status: ApplicationStatus): number | null {
  switch (status) {
    case "DRAFT":
    case "DOCUMENTS_REQUIRED":
      return 0;
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return 1;
    case "APPROVED":
    case "SCHEDULED":
      return 2;
    case "VERIFICATION_IN_PROGRESS":
      return 3;
    case "PASSED":
      return 4;
    case "CERTIFICATE_GENERATED":
      return 5;
    default:
      return null;
  }
}

function whatHappensNext(status: ApplicationStatus): string | null {
  switch (status) {
    case "DRAFT":
      return "Complete the checklist and submit to send your application for admin review.";
    case "DOCUMENTS_REQUIRED":
      return "Upload the requested corrections, then resubmit.";
    case "SUBMITTED":
      return "An administrator will review your application and notify you of the outcome.";
    case "UNDER_REVIEW":
      return "Your application is under review by the state/department administrator.";
    case "APPROVED":
      return "Approved — the administrator will assign an officer and schedule your inspection.";
    case "SCHEDULED":
      return "Your verification is scheduled. An officer will visit to inspect your instrument.";
    case "VERIFICATION_IN_PROGRESS":
      return "The officer is conducting the field verification now.";
    case "PASSED":
      return "Verification passed — your certificate is being issued.";
    case "CERTIFICATE_GENERATED":
      return "Certificate issued. View it under Certificates or scan the QR to verify publicly.";
    case "REJECTED":
      return "This application was rejected. Create a new application if needed.";
    case "CANCELLED":
      return "This application was cancelled.";
    default:
      return null;
  }
}

export function ApplicationDetailSection({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<ApplicationDetailSkeleton />}>
      <QueryErrorBoundary>
        <ApplicationDetailContent id={id} />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function ApplicationDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ApplicationDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data } = useSuspenseQuery(orpc.applications.detail.queryOptions({ input: { id } }));

  const attachmentsQuery = useQuery(
    orpc.files.listAttachments.queryOptions({ input: { instrumentId: data.application.instrumentId } }),
  );
  const attachmentsByKind = (attachmentsQuery.data ?? []).reduce<Record<string, AttachmentOutput>>((acc, att) => {
    acc[att.kind] = att;
    return acc;
  }, {});

  const submit = useMutation(
    orpc.applications.submit.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.applications.key() }),
    }),
  );
  const cancel = useMutation(
    orpc.applications.cancel.mutationOptions({
      onSuccess: () => {
        setCancelled(true);
        setCancelOpen(false);
        queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
      },
    }),
  );
  const updateDraft = useMutation(
    orpc.applications.updateDraft.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.applications.key() }),
    }),
  );

  const { application, statusHistory, completeness, instrument, appointment, priorCertificates } = data;
  const status = application.status;
  const jIdx = journeyIndex(status);
  const nextHint = whatHappensNext(status);
  const issuedCertificate = status === "CERTIFICATE_GENERATED" ? priorCertificates[0] : undefined;
  const editable = EDITABLE_STATUSES.includes(status);
  const cancellable = CANCELLABLE_STATUSES.includes(status);
  const latestReason = [...statusHistory].reverse().find((h) => h.reason)?.reason;

  const needsPreviousCert = ["RE_VERIFICATION", "POST_REPAIR_VERIFICATION", "RELOCATION_RE_VERIFICATION"].includes(application.type);
  const documentKind: { kind: AttachmentKind; label: string } = needsPreviousCert
    ? { kind: "PREVIOUS_CERTIFICATE", label: "Previous certificate" }
    : { kind: "PURCHASE_DOCUMENT", label: "Purchase document" };

  async function onAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  function refreshEvidence() {
    queryClient.invalidateQueries({ queryKey: orpc.files.key() });
    queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{application.applicationCode}</h1>
          <ApplicationStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{humanize(application.type)}</span> ·{" "}
          <Link href={`/business/instruments/${application.instrumentId}`} className="font-mono text-primary hover:underline">
            {application.instrumentCode}
          </Link>
        </p>
      </header>

      {jIdx !== null && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
          <StatusStepper
            steps={JOURNEY.map((label, i) => ({ label, done: i < jIdx, current: i === jIdx }))}
          />
          {nextHint ? <p className="text-xs text-muted-foreground">{nextHint}</p> : null}
        </div>
      )}

      {issuedCertificate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Certificate <span className="font-mono">{issuedCertificate.certificateCode}</span> issued.
          </span>
          <Link
            href={`/business/certificates/${issuedCertificate.id}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            View certificate
          </Link>
        </div>
      )}

      {actionError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</p>}

      <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Priority</dt>
          <dd className="text-sm">{application.priority}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Route</dt>
          <dd className="text-sm">{application.route ?? "Not assigned"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Preferred window</dt>
          <dd className="text-sm">
            {application.preferredStartAt && application.preferredEndAt
              ? `${formatDateTime(application.preferredStartAt)} — ${formatDateTime(application.preferredEndAt)}`
              : "Not specified"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Submitted</dt>
          <dd className="text-sm">{application.submittedAt ? formatDateTime(application.submittedAt) : "—"}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Instrument &amp; installation</h2>
        <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd className="text-sm">{instrument.instrumentTypeName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Manufacturer / Model</dt>
            <dd className="text-sm">{instrument.manufacturer} {instrument.model}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Serial number</dt>
            <dd className="text-sm">{instrument.serialNumber}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Capacity</dt>
            <dd className="text-sm">{instrument.capacity ? `${instrument.capacity} ${instrument.instrumentTypeUnit}` : "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Accuracy class</dt>
            <dd className="text-sm">{instrument.accuracyClass ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Installed address</dt>
            <dd className="text-sm">{instrument.address}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">State</dt>
            <dd className="text-sm">{instrument.stateName ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">District</dt>
            <dd className="text-sm">{instrument.districtName ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Tehsil</dt>
            <dd className="text-sm">{instrument.tehsilName ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Village / Town</dt>
            <dd className="text-sm">{instrument.villageName ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Verification schedule</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          {appointment.assigneeName || appointment.scheduledStartAt ? (
            <div className="flex flex-col gap-0.5 text-sm">
              {appointment.assigneeName && (
                <p>
                  Assigned to <span className="font-medium">{appointment.assigneeName}</span>
                </p>
              )}
              {appointment.scheduledStartAt && (
                <p>
                  Scheduled for{" "}
                  <span className="font-medium">{formatDateTime(appointment.scheduledStartAt)}</span>
                  {appointment.scheduledEndAt ? ` — ${formatDateTime(appointment.scheduledEndAt)}` : ""}
                </p>
              )}
              {appointment.location && (
                <p className="text-xs text-muted-foreground">Location: {appointment.location}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not scheduled yet.</p>
          )}
        </div>
      </section>

      {status === "DOCUMENTS_REQUIRED" && latestReason && (
        <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Corrections requested: {latestReason}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Completeness checklist</h2>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
          {completeness.checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-sm">
              <span className={check.passed ? "text-emerald-600" : "text-destructive"}>{check.passed ? "✓" : "✗"}</span>
              <span className={check.passed ? "text-foreground" : "text-destructive"}>{check.label}</span>
            </div>
          ))}
          {completeness.checks.length === 0 && <p className="text-sm text-muted-foreground">No requirements.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Status history</h2>
        {statusHistory.length > 0 ? (
          <ol className="flex flex-col gap-0">
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

      {editable ? (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Supporting Evidence</h2>
            <p className="text-xs text-muted-foreground">
              Upload a photo or document to complete the checklist. {needsPreviousCert
                ? "Include the previous certificate for re-verification."
                : "A purchase document or instrument photo is sufficient."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FileUpload
              kind="INSTRUMENT_FRONT"
              target={{ instrumentId: application.instrumentId }}
              accept="image/*"
              capture="environment"
              label="Instrument photo"
              value={attachmentsByKind["INSTRUMENT_FRONT"]}
              onUploaded={refreshEvidence}
              onRemoved={refreshEvidence}
            />
            <FileUpload
              kind={documentKind.kind}
              target={{ instrumentId: application.instrumentId }}
              accept="application/pdf,image/*"
              label={documentKind.label}
              value={attachmentsByKind[documentKind.kind]}
              onUploaded={refreshEvidence}
              onRemoved={refreshEvidence}
            />
          </div>
          <div className="mt-2">
            <AttachmentList
              target={{ instrumentId: application.instrumentId }}
              excludeKinds={["INSTRUMENT_FRONT", documentKind.kind]}
              emptyTitle={null}
            />
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Attachments & evidence</h2>
          <AttachmentList target={{ instrumentId: application.instrumentId }} emptyTitle="No files uploaded" />
        </section>
      )}

      {editable && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Preferred window</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Start</span>
              <input
                type="datetime-local"
                className={inputClass}
                defaultValue={application.preferredStartAt?.slice(0, 16) ?? ""}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">End</span>
              <input
                type="datetime-local"
                className={inputClass}
                defaultValue={application.preferredEndAt?.slice(0, 16) ?? ""}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={updateDraft.isPending}
              onClick={() =>
                onAction(() =>
                  updateDraft.mutateAsync({
                    id,
                    preferredStartAt: startAt ? new Date(startAt).toISOString() : undefined,
                    preferredEndAt: endAt ? new Date(endAt).toISOString() : undefined,
                  }),
                )
              }
            >
              Save window
            </Button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editable && completeness.complete && (
          <Button
            disabled={submit.isPending}
            onClick={() => onAction(() => submit.mutateAsync({ id }))}
          >
            {submit.isPending ? "Submitting…" : status === "DOCUMENTS_REQUIRED" ? "Resubmit application" : "Submit application"}
          </Button>
        )}

        {editable && !completeness.complete && (
          <p className="text-sm text-muted-foreground">
            Complete the checklist above before submitting.
          </p>
        )}

        {cancellable && !cancelled && !cancelOpen && (
          <Button variant="outline" onClick={() => setCancelOpen(true)}>
            Cancel application
          </Button>
        )}
      </div>

      {cancelOpen && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-sm font-medium">Reason for cancellation</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you cancelling this application?"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep application
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending || cancelReason.trim().length < 3}
              onClick={() => onAction(() => cancel.mutateAsync({ id, reason: cancelReason.trim() }))}
            >
              {cancel.isPending ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
