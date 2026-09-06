import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { ApplicationsView } from "@/modules/applications/ui/views/applications-view";

export default async function ApplicationsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.applications.listMine.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <ApplicationsView />
    </HydrateClient>
  );
}
