import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { FieldCertificatesView } from "@/modules/certificates/ui/views/field-certificates-view";

export default async function FieldCertificatesPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.certificates.listField.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <FieldCertificatesView />
    </HydrateClient>
  );
}
