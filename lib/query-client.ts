import { QueryClient } from "@tanstack/react-query";

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
