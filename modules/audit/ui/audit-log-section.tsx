"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AuditLogSection() {
  const query = useQuery(orpc.audit.listEvents.queryOptions({ input: { page: 1, limit: 50 } }));

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading audit log…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load audit log.</p>;

  const events = query.data?.items ?? [];

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Entity</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">IP</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(event.createdAt)}</td>
              <td className="px-3 py-2 font-medium">{event.action}</td>
              <td className="px-3 py-2">
                <span className="text-xs text-muted-foreground">{event.entityType}</span>
                <span className="ml-1 font-mono text-xs">{event.entityId.slice(0, 8)}</span>
              </td>
              <td className="px-3 py-2 text-xs">
                {event.actorId ? (
                  <>
                    <span className="block">{event.actorRole}</span>
                    <span className="font-mono text-xs text-muted-foreground">{event.actorId.slice(0, 8)}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">System</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{event.ipAddress ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
