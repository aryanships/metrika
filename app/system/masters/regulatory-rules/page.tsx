import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { RegulatoryRulesView } from "@/modules/masters/ui/views/regulatory-rules-view";

export default async function RegulatoryRulesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.masters.listRegulatoryRules.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  void queryClient.prefetchQuery(
    orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <RegulatoryRulesView />
    </HydrateClient>
  );
}
