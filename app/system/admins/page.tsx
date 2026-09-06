import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminAccountsView } from "@/modules/organizations/ui/views/admin-accounts-view";

export default async function SystemAdminsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.organizations.listAdmins.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  void queryClient.prefetchQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <AdminAccountsView />
    </HydrateClient>
  );
}
