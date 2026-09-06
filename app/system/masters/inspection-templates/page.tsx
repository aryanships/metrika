import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { InspectionTemplatesView } from "@/modules/masters/ui/views/inspection-templates-view";

export default async function InspectionTemplatesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.masters.listInspectionTemplates.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  void queryClient.prefetchQuery(
    orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <InspectionTemplatesView />
    </HydrateClient>
  );
}
