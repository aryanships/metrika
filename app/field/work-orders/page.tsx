import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { FieldWorkOrdersView } from "@/modules/dashboard/ui/views/field-work-orders-view";

export default async function FieldWorkOrdersPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.dashboard.getStats.queryOptions({}));

  return (
    <HydrateClient>
      <FieldWorkOrdersView />
    </HydrateClient>
  );
}
