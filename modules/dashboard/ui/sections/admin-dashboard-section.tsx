"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  DOCUMENTS_REQUIRED: "Documents required",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  VERIFICATION_IN_PROGRESS: "In progress",
  PASSED: "Passed",
  FAILED: "Failed",
  CERTIFICATE_GENERATED: "Certificate generated",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function AdminDashboardSection() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <QueryErrorBoundary>
        <AdminDashboardContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));

  const admin = data.admin;

  const appEntries = admin ? Object.entries(admin.applicationsByStatus) : [];
  const certTotal = admin ? Object.values(admin.certificatesByStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">
            {appEntries.reduce((a, [, c]) => a + c, 0)}
          </span>
          <p className="text-xs text-muted-foreground">Applications</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">{certTotal}</span>
          <p className="text-xs text-muted-foreground">Certificates</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-2xl font-semibold">{admin?.certificatesByStatus.EXPIRING_SOON ?? 0}</span>
          <p className="text-xs text-muted-foreground">Expiring soon</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Applications by status</h2>
          {appEntries.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {appEntries.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{APPLICATION_STATUS_LABELS[status] ?? status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No applications.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Applications by district</h2>
          {admin && admin.applicationsByDistrict.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.applicationsByDistrict.map((row) => (
                <div key={row.district} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{row.district}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scoped applications.</p>
          )}

          <h2 className="mt-4 text-sm font-semibold">Officer workload</h2>
          {admin && admin.lmoWorkload.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.lmoWorkload.map((lmo) => (
                <div key={lmo.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{lmo.name}</span>
                  <span className="font-medium">{lmo.open} open</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No officers.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Certificates by status</h2>
          {admin && Object.entries(admin.certificatesByStatus).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {Object.entries(admin.certificatesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{status.toLowerCase().replaceAll("_", " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certificates.</p>
          )}

          <h2 className="mt-4 text-sm font-semibold">GATC workload</h2>
          {admin && admin.gatcWorkload.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.gatcWorkload.map((gatc) => (
                <div key={gatc.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{gatc.name}</span>
                  <span className="font-medium">{gatc.open} open</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No GATCs.</p>
          )}
        </section>
      </div>
    </div>
  );
}
