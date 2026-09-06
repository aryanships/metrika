import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client.server";
import { dehydrateOptions } from "@/lib/query-client";

/**
 * Server component that dehydrates the per-request query cache into a
 * `HydrationBoundary`. Pages prefetch with `getQueryClient()` and wrap their
 * view in this component — the React `cache` in `getQueryClient` guarantees
 * the same client instance is both prefetched into and dehydrated from.
 */
export function HydrateClient({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>
      {children}
    </HydrationBoundary>
  );
}
