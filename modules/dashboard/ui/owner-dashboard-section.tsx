"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
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
  const queryClient = useQueryClient();
  const statsQuery = useQuery(orpc.dashboard.getStats.queryOptions({}));
  const notifQuery = useQuery(orpc.notifications.listMine.queryOptions({ input: { page: 1, limit: 5 } }));

  const markRead = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    }),
  );

  if (statsQuery.isPending) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const owner = statsQuery.data?.owner;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Instruments" value={owner ? totalOf(owner.instrumentsByStatus) : 0} href="/owner/instruments" />
        <StatCard label="Certificates" value={owner ? totalOf(owner.certificatesByStatus) : 0} href="/owner/certificates" />
        <StatCard label="Applications" value={owner ? totalOf(owner.applicationsByStatus) : 0} />
        <StatCard label="Upcoming appointments" value={owner?.upcomingAppointments.length ?? 0} />
      </div>

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

          <div className="mt-4">
            <Link href="/owner/instruments/new" className="text-sm font-medium text-primary hover:underline">
              Register an instrument →
            </Link>
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
