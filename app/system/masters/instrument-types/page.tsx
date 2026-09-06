import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { InstrumentTypesView } from "@/modules/masters/ui/views/instrument-types-view";

export default async function InstrumentTypesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <InstrumentTypesView />
    </HydrateClient>
  );
}
