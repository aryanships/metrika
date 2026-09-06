import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdministrativeUnitsView } from "@/modules/masters/ui/views/administrative-units-view";

export default async function AdministrativeUnitsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <AdministrativeUnitsView />
    </HydrateClient>
  );
}
