import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { CertificateView } from "@/modules/certificates/ui/views/certificate-view";

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.certificates.get.queryOptions({ input: { id } }));

  return (
    <HydrateClient>
      <CertificateView id={id} />
    </HydrateClient>
  );
}
