"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { Pagination } from "@/components/pagination";

const inputClass =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AuditLogSection() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const query = useQuery(
    orpc.audit.listEvents.queryOptions({
      input: { page, limit: 50, action: action || undefined },
    }),
  );

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading audit log…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load audit log.</p>;

  const events = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          placeholder="Filter by action…"
        />
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
      ) : (
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
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasMore={pagination.hasMore}
          onPage={setPage}
        />
      )}
    </div>
  );
}
