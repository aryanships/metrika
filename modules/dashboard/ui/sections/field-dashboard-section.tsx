"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge } from "@/modules/applications/ui/components/application-status-badge";
import type { ApplicationStatus } from "@/modules/applications/schema";
import type { IdentifyInstrumentOutput } from "@/modules/instruments/schema";

function formatDate(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function FieldDashboardSection() {
  return (
    <Suspense fallback={<FieldDashboardSkeleton />}>
      <QueryErrorBoundary>
        <FieldDashboardContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function FieldDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function FieldDashboardContent() {
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));
  const [code, setCode] = useState("");
  const [identified, setIdentified] = useState<IdentifyInstrumentOutput | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const identify = useMutation(
    orpc.instruments.identify.mutationOptions({
      onSuccess: (data) => {
        setIdentified(data);
        setIdentifyError(null);
      },
      onError: (err) => setIdentifyError(describeError(err)),
    }),
  );

  const field = data.field;

  function onSubmitIdentify(e: React.FormEvent) {
    e.preventDefault();
    setIdentified(null);
    if (code.trim()) identify.mutate({ code: code.trim() });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Identify instrument</h2>
        <form onSubmit={onSubmitIdentify} className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter instrument code (e.g. DMI-EWB-001)"
          />
          <Button type="submit" disabled={identify.isPending} className="shrink-0">
            {identify.isPending ? "Looking up…" : "Identify"}
          </Button>
        </form>
        {identifyError && <p className="text-sm text-destructive">{identifyError}</p>}
        {identified && (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-background p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{identified.instrumentCode}</span>
              <span className="text-xs text-muted-foreground">{identified.instrumentTypeName}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Serial {identified.serialNumber} · {identified.status}
            </p>
            {identified.latestApplicationId && (
              <Link href={`/field/applications/${identified.latestApplicationId}`} className="text-xs font-medium text-primary hover:underline">
                View latest application
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">{field?.assigned ?? 0}</span>
          <p className="text-xs text-muted-foreground">Assigned</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">{field?.today ?? 0}</span>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">{field?.pending ?? 0}</span>
          <p className="text-xs text-muted-foreground">Pending completion</p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Work orders</h2>
        {field && field.workOrders.length > 0 ? (
          <div className="flex flex-col gap-2">
            {field.workOrders.map((w) => (
              <Link
                key={w.applicationId}
                href={`/field/applications/${w.applicationId}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{w.applicationCode}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.instrumentCode} · {w.instrumentType}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{formatDate(w.scheduledStartAt)}</span>
                  <ApplicationStatusBadge status={w.status as ApplicationStatus} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assigned work yet.</p>
        )}
      </section>
    </div>
  );
}
