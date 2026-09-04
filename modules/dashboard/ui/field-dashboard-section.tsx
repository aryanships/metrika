"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";

function formatDate(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FieldDashboardSection() {
  const statsQuery = useQuery(orpc.dashboard.getStats.queryOptions({}));

  if (statsQuery.isPending) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const field = statsQuery.data?.field;

  return (
    <div className="flex flex-col gap-6">
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
              <div key={w.applicationId} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-medium">{w.applicationCode}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.instrumentCode} · {w.instrumentType}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(w.scheduledStartAt)}</span>
                  <span className="text-xs font-medium">{w.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assigned work yet.</p>
        )}
      </section>
    </div>
  );
}
