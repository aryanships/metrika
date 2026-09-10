"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AttachmentList } from "@/components/attachment-list";
import { ApplicationStatusBadge } from "../components/application-status-badge";
import type { Priority } from "../../schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const textareaClass =
  "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function AdminApplicationDetailSection({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<AdminApplicationDetailSkeleton />}>
      <QueryErrorBoundary>
        <AdminApplicationDetailContent id={id} />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminApplicationDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function AdminApplicationDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [correctionReason, setCorrectionReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data } = useSuspenseQuery(orpc.applications.detail.queryOptions({ input: { id } }));
  const workOrdersQuery = useQuery(
    orpc.scheduling.listWorkOrders.queryOptions({ input: { applicationId: id } }),
  );
  const recommendQuery = useQuery(
    orpc.scheduling.recommend.queryOptions({
      input: { applicationId: id },
      enabled: data.application.status === "APPROVED",
    }),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
    queryClient.invalidateQueries({ queryKey: orpc.scheduling.key() });
  };

  const startReview = useMutation(orpc.applications.startReview.mutationOptions({ onSuccess: invalidate }));
  const approve = useMutation(orpc.applications.approve.mutationOptions({ onSuccess: invalidate }));
  const requestCorrections = useMutation(orpc.applications.requestCorrections.mutationOptions({ onSuccess: invalidate }));
  const reject = useMutation(orpc.applications.reject.mutationOptions({ onSuccess: invalidate }));
  const setPriority = useMutation(orpc.applications.setPriority.mutationOptions({ onSuccess: invalidate }));
  const assign = useMutation(orpc.scheduling.assign.mutationOptions({ onSuccess: invalidate }));
  const schedule = useMutation(orpc.scheduling.schedule.mutationOptions({ onSuccess: invalidate }));

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(describeError(err));
    }
  }

  const { application, instrument, businessName, statusHistory, completeness } = data;
  const status = application.status;
  const workOrder = workOrdersQuery.data?.items[0];
  const candidates = recommendQuery.data?.candidates ?? [];
  const recommendedRoute = recommendQuery.data?.recommendedRoute;

  const reviewable = status === "SUBMITTED" || status === "UNDER_REVIEW";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{application.applicationCode}</h1>
          <ApplicationStatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{humanize(application.type)}</span> · {businessName} · {instrument.instrumentCode}
        </p>
      </header>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <Field label="Business">{businessName}</Field>
        <Field label="Instrument">{instrument.instrumentCode}</Field>
        <Field label="Category">{instrument.instrumentTypeName}</Field>
        <Field label="Manufacturer & model">
          {instrument.manufacturer} · {instrument.model}
        </Field>
        <Field label="Serial number">
          <span className="font-mono">{instrument.serialNumber}</span>
        </Field>
        <Field label="Capacity">
          {instrument.capacity ? `${instrument.capacity} ${instrument.instrumentTypeUnit}`.trim() : "—"}
        </Field>
        <Field label="Accuracy class">{instrument.accuracyClass ?? "—"}</Field>
        <Field label="Location">{instrument.administrativeUnitName}</Field>
        <Field label="Address">{instrument.address}</Field>
        <Field label="Preferred window">
          {application.preferredStartAt && application.preferredEndAt
            ? `${formatDateTime(application.preferredStartAt)} — ${formatDateTime(application.preferredEndAt)}`
            : "Not specified"}
        </Field>
      </dl>

      {reviewable && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-sm font-medium">Priority</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={application.priority}
            disabled={setPriority.isPending}
            onChange={(e) => run(() => setPriority.mutateAsync({ id, priority: e.target.value as Priority }))}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{humanize(p)}</option>
            ))}
          </select>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Completeness checklist</h2>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
          {completeness.checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-sm">
              <span className={check.passed ? "text-emerald-600" : "text-destructive"}>{check.passed ? "✓" : "✗"}</span>
              <span>{check.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Documents & photos</h2>
        <AttachmentList target={{ instrumentId: instrument.id }} emptyTitle="No documents uploaded" />
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

      {status === "SUBMITTED" && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={startReview.isPending} onClick={() => run(() => startReview.mutateAsync({ id }))}>
            {startReview.isPending ? "Starting…" : "Start review"}
          </Button>
        </div>
      )}

      {status === "UNDER_REVIEW" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Review decision</h2>
          <div className="flex flex-wrap gap-2">
            <Button disabled={approve.isPending} onClick={() => run(() => approve.mutateAsync({ id }))}>
              Approve
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Request corrections</span>
            <textarea
              className={textareaClass}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="What must the owner fix?"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={requestCorrections.isPending || correctionReason.trim().length < 5}
                onClick={() => run(() => requestCorrections.mutateAsync({ id, reason: correctionReason.trim() }))}
              >
                {requestCorrections.isPending ? "Requesting…" : "Request corrections"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-sm font-medium text-destructive">Reject application</span>
            <textarea
              className={textareaClass}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (required)"
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                disabled={reject.isPending || rejectReason.trim().length < 5}
                onClick={() => run(() => reject.mutateAsync({ id, reason: rejectReason.trim() }))}
              >
                {reject.isPending ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Recommendation & assignment</h2>
          <p className="text-xs text-muted-foreground">
            Recommended route: <span className="font-medium">{recommendedRoute ?? "—"}</span>
          </p>

          {!workOrder && (recommendQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Evaluating candidates…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No eligible LMO or GATC candidates for this application.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((c) => (
                <div key={`${c.candidateType}-${c.candidateId}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.candidateType}</span>
                      {candidates[0]?.candidateId === c.candidateId && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Score {c.totalScore}% · distance {c.estimatedDistanceKm ?? "n/a"} km · workload {c.currentWorkload}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    disabled={assign.isPending}
                    onClick={() => run(() => assign.mutateAsync({ applicationId: id, route: c.candidateType, assigneeId: c.candidateId, overrideReason: overrideReason || undefined }))}
                  >
                    Assign
                  </Button>
                </div>
              ))}
              <input
                className={inputClass}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Override reason (optional — audited)"
              />
            </div>
          ))}

          {workOrder && (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">
                Assigned to <span className="font-medium text-foreground">{workOrder.assigneeName ?? workOrder.route}</span>
                {workOrder.wasOverridden && <span className="ml-2 text-amber-600 dark:text-amber-400">(overridden)</span>}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Start</span>
                  <input type="datetime-local" className={inputClass} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">End</span>
                  <input type="datetime-local" className={inputClass} value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Location (optional)</span>
                <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Verification location" />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={schedule.isPending || !startAt || !endAt}
                  onClick={() =>
                    run(() =>
                      schedule.mutateAsync({
                        applicationId: id,
                        scheduledStartAt: new Date(startAt).toISOString(),
                        scheduledEndAt: new Date(endAt).toISOString(),
                        location: location || undefined,
                      }),
                    )
                  }
                >
                  {schedule.isPending ? "Scheduling…" : "Confirm schedule"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === "SCHEDULED" && workOrder && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Scheduled appointment</h2>
          <p className="mt-1 text-sm">
            {workOrder.scheduledStartAt && workOrder.scheduledEndAt
              ? `${formatDateTime(workOrder.scheduledStartAt)} — ${formatDateTime(workOrder.scheduledEndAt)}`
              : "Awaiting confirmation"}
          </p>
          {workOrder.assigneeName && (
            <p className="text-xs text-muted-foreground">Assigned to {workOrder.assigneeName}</p>
          )}
          {workOrder.location && <p className="text-xs text-muted-foreground">{workOrder.location}</p>}
        </div>
      )}
    </div>
  );
}
