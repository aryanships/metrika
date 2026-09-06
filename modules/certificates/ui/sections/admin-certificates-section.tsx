"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { CertificateStatusBadge } from "../components/certificate-status-badge";
import type { CertificateOutput } from "../../schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const CHANGE_STATUSES = ["SUSPENDED", "CANCELLED", "REVOKED", "SUPERSEDED"] as const;

export function AdminCertificatesSection() {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("SUSPENDED");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Suspense fallback={<AdminCertificatesSkeleton />}>
        <QueryErrorBoundary>
          <AdminCertificatesContent
            targetId={targetId}
            newStatus={newStatus}
            reason={reason}
            onTargetIdChange={setTargetId}
            onNewStatusChange={setNewStatus}
            onReasonChange={setReason}
            onError={setError}
          />
        </QueryErrorBoundary>
      </Suspense>
    </div>
  );
}

export function AdminCertificatesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function AdminCertificatesContent({
  targetId,
  newStatus,
  reason,
  onTargetIdChange,
  onNewStatusChange,
  onReasonChange,
  onError,
}: {
  targetId: string | null;
  newStatus: string;
  reason: string;
  onTargetIdChange: (id: string | null) => void;
  onNewStatusChange: (s: string) => void;
  onReasonChange: (r: string) => void;
  onError: (e: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(orpc.certificates.list.queryOptions({ input: { page: 1, limit: 100 } }));
  const passedQuery = useQuery(
    orpc.applications.listQueue.queryOptions({ input: { page: 1, limit: 100, status: "PASSED" } }),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.certificates.key() });
    queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
  };

  const issue = useMutation(orpc.certificates.issue.mutationOptions({ onSuccess: invalidate }));
  const updateStatus = useMutation(orpc.certificates.updateStatus.mutationOptions({ onSuccess: invalidate }));

  async function run(fn: () => Promise<unknown>) {
    onError(null);
    try {
      await fn();
      onTargetIdChange(null);
      onReasonChange("");
    } catch (err) {
      onError(describeError(err));
    }
  }

  const passed = passedQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Issue certificates</h2>
        <p className="text-xs text-muted-foreground">Passed applications awaiting certificate issuance.</p>
        {passed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passed applications awaiting issuance.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {passed.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{app.applicationCode}</span>
                  <span className="text-xs text-muted-foreground">{app.instrumentCode}</span>
                </div>
                <Button size="sm" disabled={issue.isPending} onClick={() => run(() => issue.mutateAsync({ applicationId: app.id }))}>
                  Issue
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <DataTable<CertificateOutput>
        rows={data.items}
        getRowKey={(r) => r.id}
        emptyTitle="No certificates issued"
        columns={[
          {
            header: "Code",
            cell: (r) => <span className="font-mono font-medium">{r.certificateCode}</span>,
          },
          {
            header: "Instrument",
            cell: (r) => (
              <div className="flex flex-col">
                <span className="font-mono text-xs">{r.instrument.code}</span>
                <span className="text-xs text-muted-foreground">{r.instrument.typeName}</span>
              </div>
            ),
          },
          { header: "Business", cell: (r) => <span className="text-xs">{r.businessName}</span> },
          { header: "Status", cell: (r) => <CertificateStatusBadge status={r.status} /> },
          { header: "Valid until", cell: (r) => <span className="text-xs">{formatDate(r.validUntil)}</span> },
          {
            header: "",
            cell: (r) =>
              r.status === "ACTIVE" || r.status === "EXPIRING_SOON" ? (
                <Button variant="outline" size="sm" onClick={() => { onTargetIdChange(r.id); onNewStatusChange("SUSPENDED"); onReasonChange(""); }}>
                  Change status
                </Button>
              ) : null,
          },
        ]}
      />

      {targetId && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Change certificate status</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">New status</span>
              <select className={inputClass} value={newStatus} onChange={(e) => onNewStatusChange(e.target.value)}>
                {CHANGE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Reason</span>
              <input className={inputClass} value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Required" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onTargetIdChange(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={updateStatus.isPending || reason.trim().length < 1}
              onClick={() => run(() => updateStatus.mutateAsync({ id: targetId, status: newStatus as (typeof CHANGE_STATUSES)[number], reason: reason.trim() }))}
            >
              {updateStatus.isPending ? "Updating…" : "Apply status change"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
