import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { FieldApplicationView } from "@/modules/applications/ui/views/field-application-view";

export default async function FieldApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.applications.detail.queryOptions({ input: { id } }));

  return (
    <HydrateClient>
      <FieldApplicationView id={id} />
    </HydrateClient>
  );
}
