"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export function NotificationsListSection() {
  const queryClient = useQueryClient();
  const query = useQuery(orpc.notifications.listMine.queryOptions({ input: { page: 1, limit: 100 } }));

  const markRead = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
    }),
  );

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading notifications…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load notifications.</p>;

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <EmptyState title="No notifications" description="Updates about your instruments and certificates appear here." />
      ) : (
        items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
              n.isRead ? "border-border bg-card" : "border-primary/40 bg-muted/30"
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.isRead && <span className="size-1.5 rounded-full bg-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground/70">{formatDateTime(n.createdAt)}</p>
            </div>
            {!n.isRead && (
              <Button variant="outline" size="sm" onClick={() => markRead.mutate({ id: n.id })}>
                Mark read
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
