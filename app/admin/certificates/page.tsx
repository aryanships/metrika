import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { AdminCertificatesView } from "@/modules/certificates/ui/views/admin-certificates-view";

export default async function AdminCertificatesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.certificates.list.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  void queryClient.prefetchQuery(
    orpc.applications.listQueue.queryOptions({ input: { page: 1, limit: 100, status: "PASSED" } }),
  );

  return (
    <HydrateClient>
      <AdminCertificatesView />
    </HydrateClient>
  );
}
