import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminApplicationView } from "@/modules/applications/ui/views/admin-application-view";

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.applications.detail.queryOptions({ input: { id } }));
  void queryClient.prefetchQuery(
    orpc.scheduling.listWorkOrders.queryOptions({ input: { applicationId: id } }),
  );

  return (
    <HydrateClient>
      <AdminApplicationView id={id} />
    </HydrateClient>
  );
}
