import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AuditLogView } from "@/modules/audit/ui/views/audit-log-view";

export default async function AuditLogPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.audit.listEvents.queryOptions({ input: { page: 1, limit: 50 } }),
  );

  return (
    <HydrateClient>
      <AuditLogView description="Append-only record of who did what, when." />
    </HydrateClient>
  );
}
