import { orpc } from "@/lib/orpc-query.server";
import { getQueryClient } from "@/lib/query-client.server";
import { HydrateClient } from "@/components/hydrate-client";
import { NotificationsView } from "@/modules/notifications/ui/views/notifications-view";

export default async function NotificationsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.notifications.listMine.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  return (
    <HydrateClient>
      <NotificationsView />
    </HydrateClient>
  );
}
