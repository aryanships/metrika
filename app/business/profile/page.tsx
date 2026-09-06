import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { BusinessProfileView } from "@/modules/businesses/ui/views/business-profile-view";

export default async function ProfilePage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(orpc.businesses.get.queryOptions());

  return (
    <HydrateClient>
      <BusinessProfileView />
    </HydrateClient>
  );
}
