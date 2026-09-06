import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminDashboardView } from "@/modules/dashboard/ui/views/admin-dashboard-view";

export default async function AdminDashboardPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.dashboard.getStats.queryOptions({}));

  return (
    <HydrateClient>
      <AdminDashboardView />
    </HydrateClient>
  );
}
