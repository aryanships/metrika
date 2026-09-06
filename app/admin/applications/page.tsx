import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminApplicationsView } from "@/modules/applications/ui/views/admin-applications-view";

export default async function AdminApplicationsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.applications.listQueue.queryOptions({ input: { page: 1, limit: 20, sortOrder: "asc" } }),
  );

  return (
    <HydrateClient>
      <AdminApplicationsView />
    </HydrateClient>
  );
}
