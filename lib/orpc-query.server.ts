import "server-only";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createRouterClient } from "@orpc/server";
import { router } from "@/app/router";
import { headers } from "next/headers";
import { createInitialContext } from "@/middleware/context";

/**
 * Server-only query/mutation options for prefetching during RSC render.
 *
 * Uses the in-process router client so `queryClient.prefetchQuery(...)` runs
 * the procedure directly against the current request's context. Query keys
 * generated here are identical to the browser util (`lib/orpc-query.ts`),
 * so hydration matches 1:1.
 */
const client = createRouterClient(router, {
  context: async () => createInitialContext(await headers(), new Headers()),
});

export const orpc = createTanstackQueryUtils(client);
