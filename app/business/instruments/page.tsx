import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { InstrumentsView } from "@/modules/instruments/ui/views/instruments-view";

export default async function InstrumentsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.instruments.list.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <InstrumentsView />
    </HydrateClient>
  );
}
