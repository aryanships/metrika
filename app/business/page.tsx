import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { OwnerDashboardView } from "@/modules/dashboard/ui/views/owner-dashboard-view";

export default async function OwnerDashboardPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.dashboard.getStats.queryOptions({}));
  void queryClient.prefetchQuery(
    orpc.notifications.listMine.queryOptions({ input: { page: 1, limit: 5 } }),
  );

  return (
    <HydrateClient>
      <OwnerDashboardView />
    </HydrateClient>
  );
}
