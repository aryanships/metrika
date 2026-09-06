import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { CertificatesView } from "@/modules/certificates/ui/views/certificates-view";

export default async function CertificatesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.certificates.listMine.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <CertificatesView />
    </HydrateClient>
  );
}
