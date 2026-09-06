import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { SystemDashboardView } from "@/modules/dashboard/ui/views/system-dashboard-view";

export default async function SystemDashboardPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.dashboard.getStats.queryOptions({}));

  return (
    <HydrateClient>
      <SystemDashboardView />
    </HydrateClient>
  );
}
