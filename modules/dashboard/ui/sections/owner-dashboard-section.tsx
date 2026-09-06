"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { InstrumentStatusBadge } from "@/modules/instruments/ui/components/instrument-status-badge";
import { CertificateStatusBadge } from "@/modules/certificates/ui/components/certificate-status-badge";
import type { InstrumentStatus } from "@/modules/instruments/schema";
import type { CertificateStatus } from "@/modules/certificates/schema";

function totalOf(record: Record<string, number>): number {
  return Object.values(record).reduce((sum, n) => sum + n, 0);
}

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
  return href ? <Link href={href} className="transition-colors hover:border-ring">{content}</Link> : content;
}

export function OwnerDashboardSection() {
  return (
    <Suspense fallback={<OwnerDashboardSkeleton />}>
      <QueryErrorBoundary>
        <OwnerDashboardContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function OwnerDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function OwnerDashboardContent() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));
  const notifQuery = useQuery(orpc.notifications.listMine.queryOptions({ input: { page: 1, limit: 5 } }));

  const markRead = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
    }),
  );

  const owner = data.owner;
  const expired = owner?.certificatesByStatus["EXPIRED"] ?? 0;
  const expiring = owner?.certificatesByStatus["EXPIRING_SOON"] ?? 0;
  const needsReverification = expired + expiring > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Instruments" value={owner ? totalOf(owner.instrumentsByStatus) : 0} href="/business/instruments" />
        <StatCard label="Certificates" value={owner ? totalOf(owner.certificatesByStatus) : 0} href="/business/certificates" />
        <StatCard label="Applications" value={owner ? totalOf(owner.applicationsByStatus) : 0} href="/business/applications" />
        <StatCard label="Upcoming appointments" value={owner?.upcomingAppointments.length ?? 0} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/business/instruments/new" className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-ring">
            Register instrument
          </Link>
          <Link href="/business/applications/new" className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-ring">
            New application
          </Link>
          <Link href="/verify" className="rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-ring">
            Verify a certificate
          </Link>
        </div>
      </section>

      {needsReverification && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <div>
            <p className="text-sm font-medium">Certificates need attention</p>
            <p className="text-xs text-muted-foreground">
              {expiring} expiring soon, {expired} expired. Apply for re-verification to stay compliant.
            </p>
          </div>
          <Link href="/business/applications/new?type=RE_VERIFICATION" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            Apply for re-verification
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Instruments by status</h2>
          <div className="flex flex-wrap gap-2">
            {owner && Object.entries(owner.instrumentsByStatus).length > 0 ? (
              Object.entries(owner.instrumentsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <InstrumentStatusBadge status={status as InstrumentStatus} />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No instruments yet.</p>
            )}
          </div>

          <h2 className="mt-4 text-sm font-semibold">Certificates by status</h2>
          <div className="flex flex-wrap gap-2">
            {owner && Object.entries(owner.certificatesByStatus).length > 0 ? (
              Object.entries(owner.certificatesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <CertificateStatusBadge status={status as CertificateStatus} />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No certificates yet.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Upcoming appointments</h2>
          {owner && owner.upcomingAppointments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {owner.upcomingAppointments.map((appt) => (
                <div key={appt.applicationCode} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="font-mono font-medium">{appt.applicationCode}</p>
                  <p className="text-muted-foreground">{appt.instrumentCode}</p>
                  {appt.scheduledStartAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.scheduledStartAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          )}

          <h2 className="mt-4 text-sm font-semibold">Notifications</h2>
          {notifQuery.data && notifQuery.data.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              {notifQuery.data.items.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate({ id: n.id })}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          )}
        </section>
      </div>
    </div>
  );
}
