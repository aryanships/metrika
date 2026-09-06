import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminLmosView } from "@/modules/organizations/ui/views/admin-lmos-view";

export default async function AdminLmosPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.organizations.listLmos.queryOptions({ input: { page: 1, limit: 200, activeOnly: false } }),
  );
  void queryClient.prefetchQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { type: "DISTRICT", page: 1, limit: 200 } }),
  );
  void queryClient.prefetchQuery(
    orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <AdminLmosView />
    </HydrateClient>
  );
}
