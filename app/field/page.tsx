import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { FieldDashboardView } from "@/modules/dashboard/ui/views/field-dashboard-view";

export default async function FieldDashboardPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.dashboard.getStats.queryOptions({}));

  return (
    <HydrateClient>
      <FieldDashboardView />
    </HydrateClient>
  );
}
