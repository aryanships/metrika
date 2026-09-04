import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { client } from "./orpc.client";

/**
 * Single source of query/mutation options for the app.
 *   orpc.instruments.list.queryOptions({ input: { page: 1, limit: 20 } })
 *   orpc.instruments.create.mutationOptions()
 */
export const orpc = createTanstackQueryUtils(client);
