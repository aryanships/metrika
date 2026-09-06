import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { ApplicationView } from "@/modules/applications/ui/views/application-view";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.applications.detail.queryOptions({ input: { id } }));

  return (
    <HydrateClient>
      <ApplicationView id={id} />
    </HydrateClient>
  );
}
