import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { router } from "@/app/router";

// Browser-only client. `router` is imported as a type only so no server code
// (repositories, next/headers, etc.) reaches the client bundle.
const link = new RPCLink({
  url: "/rpc",
  origin: () => window.location.origin,
});

export const client: RouterClient<typeof router> = createORPCClient(link);
