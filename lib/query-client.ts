import {
  QueryClient,
  defaultShouldDehydrateQuery,
  type Query,
} from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep freshly-fetched data stable across short remounts.
        staleTime: 30 * 1000,
      },
    },
  });
}

/**
 * Dehydrate config used in pages: keep pending queries so a prefetch that is
 * still in flight on the server is not dropped before hydration.
 */
export const dehydrateOptions = {
  shouldDehydrateQuery: (query: Query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === "pending",
};
