"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStatusBadge } from "@/modules/applications/ui/components/application-status-badge";
import type { ApplicationStatus } from "@/modules/applications/schema";

function formatDate(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function WorkOrderList({ orders }: { orders: { applicationId: string; applicationCode: string; instrumentCode: string; instrumentType: string; scheduledStartAt: string | null; scheduledEndAt: string | null; location: string | null; status: string }[] }) {
  if (orders.length === 0) return <p className="text-sm text-muted-foreground">None.</p>;
  return (
    <div className="flex flex-col gap-2">
      {orders.map((w) => (
        <Link
          key={w.applicationId}
          href={`/field/applications/${w.applicationId}`}
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-medium">{w.applicationCode}</span>
            <span className="text-xs text-muted-foreground">
              {w.instrumentCode} · {w.instrumentType}
              {w.location ? ` · ${w.location}` : ""}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(w.scheduledStartAt)}</span>
            <ApplicationStatusBadge status={w.status as ApplicationStatus} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function FieldWorkOrdersSection() {
  return (
    <Suspense fallback={<FieldWorkOrdersSkeleton />}>
      <QueryErrorBoundary>
        <FieldWorkOrdersContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function FieldWorkOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

function FieldWorkOrdersContent() {
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));

  const workOrders = data.field?.workOrders ?? [];
  const scheduled = workOrders.filter((w) => w.status === "SCHEDULED");
  const inProgress = workOrders.filter((w) => w.status === "VERIFICATION_IN_PROGRESS");
  const completed = workOrders.filter((w) => ["PASSED", "FAILED", "CERTIFICATE_GENERATED"].includes(w.status));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Scheduled</h2>
        <WorkOrderList orders={scheduled} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">In progress</h2>
        <WorkOrderList orders={inProgress} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Completed</h2>
        <WorkOrderList orders={completed} />
      </section>
    </div>
  );
}
