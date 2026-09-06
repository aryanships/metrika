import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { InstrumentView } from "@/modules/instruments/ui/views/instrument-view";

export default async function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.instruments.passport.queryOptions({ input: { id } }));

  return (
    <HydrateClient>
      <InstrumentView id={id} />
    </HydrateClient>
  );
}
